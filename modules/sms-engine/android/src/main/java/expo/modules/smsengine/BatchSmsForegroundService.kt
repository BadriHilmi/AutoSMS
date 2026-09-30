package expo.modules.smsengine

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject

class BatchSmsForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "AutoSMS_Batch_Channel"
        const val NOTIFICATION_ID = 1001
        const val EXTRA_TASK_ID = "extra_task_id"
        const val EXTRA_MESSAGE = "extra_message"
        const val EXTRA_RECIPIENTS_JSON = "extra_recipients_json"
        const val EXTRA_INTERVAL_DELAY = "extra_interval_delay"
        const val EXTRA_SIM_SLOT = "extra_sim_slot"
        const val EXTRA_FREQUENCY = "extra_frequency"
        const val EXTRA_CUSTOM_RULE = "extra_custom_rule"

        const val PREFS_NAME = "AutoSMS_Sync_Prefs"
        const val KEY_PENDING_EVENTS = "pending_events"
        const val ACTION_CAMPAIGN_UPDATE = "expo.modules.smsengine.CAMPAIGN_UPDATE"
    }

    private var isRunning = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) return START_NOT_STICKY

        val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: "unknown_task"
        val message = intent.getStringExtra(EXTRA_MESSAGE) ?: ""
        val recipientsJson = intent.getStringExtra(EXTRA_RECIPIENTS_JSON) ?: "[]"
        val intervalDelaySec = intent.getIntExtra(EXTRA_INTERVAL_DELAY, 10)
        val simSlot = intent.getIntExtra(EXTRA_SIM_SLOT, 0)
        val frequency = intent.getStringExtra(EXTRA_FREQUENCY) ?: "ONE_TIME"
        val customRule = intent.getStringExtra(EXTRA_CUSTOM_RULE) ?: ""

        val notification = buildNotification("Preparing campaign...", 0, 0)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        if (!isRunning) {
            isRunning = true
            Thread {
                processBatchSending(taskId, message, recipientsJson, intervalDelaySec, simSlot, frequency, customRule)
            }.start()
        }

        return START_NOT_STICKY
    }

    private fun appendPendingEvent(eventJson: JSONObject) {
        try {
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val current = prefs.getString(KEY_PENDING_EVENTS, "[]") ?: "[]"
            val array = JSONArray(current)
            array.put(eventJson)
            prefs.edit().putString(KEY_PENDING_EVENTS, array.toString()).apply()

            // Broadcast so active React Native app can sync immediately
            val broadcastIntent = Intent(ACTION_CAMPAIGN_UPDATE)
            sendBroadcast(broadcastIntent)
        } catch (e: Exception) {
            Log.e("AutoSMS", "Failed to append pending event", e)
        }
    }

    private fun processBatchSending(
        taskId: String?,
        message: String,
        recipientsJson: String,
        intervalDelaySec: Int,
        simSlot: Int,
        frequency: String,
        customRule: String
    ) {
        try {
            if (!taskId.isNullOrEmpty()) {
                val startEvt = JSONObject().apply {
                    put("type", "STARTED")
                    put("taskId", taskId)
                    put("timestamp", System.currentTimeMillis())
                }
                appendPendingEvent(startEvt)
                Log.d("AutoSMS", "Task $taskId set to RUNNING")
            }

            val jsonArray = JSONArray(recipientsJson)
            val total = jsonArray.length()
            val smsManager = getSmsManagerForSlot(simSlot)

            for (i in 0 until total) {
                val item = jsonArray.getJSONObject(i)
                val phone = item.optString("phone", item.optString("phoneNumber", ""))
                val name = item.optString("name", "")

                if (phone.isNotEmpty()) {
                    updateNotification("Sending to $phone (${i + 1}/$total)", i + 1, total)

                    // Personalize message
                    val personalized = message.replace("{FirstName}", name.split(" ").firstOrNull() ?: "")
                        .replace("{LastName}", name.split(" ").drop(1).joinToString(" "))
                        .replace("{Date}", java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault()).format(java.util.Date()))
                        .replace("{Time}", java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault()).format(java.util.Date()))

                    sendSms(smsManager, phone, personalized)

                    if (!taskId.isNullOrEmpty()) {
                        val progressEvt = JSONObject().apply {
                            put("type", "PROGRESS")
                            put("taskId", taskId)
                            put("sentCount", i + 1)
                            put("contactName", name)
                            put("phoneNumber", phone)
                            put("messageContent", personalized)
                            put("simSlot", simSlot)
                            put("timestamp", System.currentTimeMillis())
                        }
                        appendPendingEvent(progressEvt)
                    }

                    // Wait throttle delay
                    if (i < total - 1) {
                        Thread.sleep((intervalDelaySec * 1000).toLong())
                    }
                }
            }

            if (!taskId.isNullOrEmpty()) {
                var nextRun: Long? = null
                var updatedRuleStr = customRule

                if (frequency == "DAILY" || frequency == "WEEKLY") {
                    val addMillis = if (frequency == "DAILY") 86400000L else 7L * 86400000L
                    nextRun = System.currentTimeMillis() + addMillis
                } else if (frequency == "CUSTOM" && customRule.isNotEmpty()) {
                    try {
                        val ruleObj = JSONObject(customRule)
                        val interval = Math.max(1, ruleObj.optInt("interval", 1))
                        val unit = ruleObj.optString("unit", "DAYS")
                        val endType = ruleObj.optString("endType", "NEVER")
                        val occurrenceCount = if (ruleObj.has("occurrenceCount")) ruleObj.optInt("occurrenceCount", 0) else null
                        val currentOccurrence = ruleObj.optInt("currentOccurrence", 0) + 1
                        val endDate = if (ruleObj.has("endDate")) ruleObj.optLong("endDate", 0L) else null

                        var isExpired = false
                        if (endType == "AFTER_OCCURRENCES" && occurrenceCount != null && currentOccurrence >= occurrenceCount) {
                            isExpired = true
                        }

                        if (!isExpired) {
                            val computedNext: Long
                            val nowMs = System.currentTimeMillis()
                            if (unit == "WEEKS") {
                                computedNext = nowMs + (interval * 7L * 86400000L)
                            } else if (unit == "MONTHS") {
                                val cal = java.util.Calendar.getInstance()
                                cal.timeInMillis = nowMs
                                cal.add(java.util.Calendar.MONTH, interval)
                                computedNext = cal.timeInMillis
                            } else {
                                computedNext = nowMs + (interval * 86400000L)
                            }

                            if (!(endType == "ON_DATE" && endDate != null && computedNext > endDate)) {
                                nextRun = computedNext
                                ruleObj.put("currentOccurrence", currentOccurrence)
                                updatedRuleStr = ruleObj.toString()
                            }
                        }
                    } catch (e: Exception) {
                        Log.e("AutoSMS", "Failed parsing custom recurrence in service", e)
                    }
                }

                if (nextRun != null) {
                    val recurringEvt = JSONObject().apply {
                        put("type", "COMPLETED")
                        put("taskId", taskId)
                        put("frequency", frequency)
                        put("customRule", updatedRuleStr)
                        put("nextRun", nextRun)
                        put("totalSent", total)
                        put("timestamp", System.currentTimeMillis())
                    }
                    appendPendingEvent(recurringEvt)

                    // Reschedule next run with AlarmManager
                    val alarmMgr = getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                    val intent = Intent(this, AlarmReceiver::class.java).apply {
                        putExtra(EXTRA_TASK_ID, taskId)
                        putExtra(EXTRA_MESSAGE, message)
                        putExtra(EXTRA_RECIPIENTS_JSON, recipientsJson)
                        putExtra(EXTRA_INTERVAL_DELAY, intervalDelaySec)
                        putExtra(EXTRA_SIM_SLOT, simSlot)
                        putExtra(EXTRA_FREQUENCY, frequency)
                        putExtra(EXTRA_CUSTOM_RULE, updatedRuleStr)
                    }
                    val pi = PendingIntent.getBroadcast(this, taskId.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmMgr?.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextRun, pi)
                    } else {
                        alarmMgr?.setExact(AlarmManager.RTC_WAKEUP, nextRun, pi)
                    }
                    Log.d("AutoSMS", "Recurring task $taskId rescheduled to $nextRun")
                } else {
                    val completedEvt = JSONObject().apply {
                        put("type", "COMPLETED")
                        put("taskId", taskId)
                        put("frequency", if (frequency == "CUSTOM") "CUSTOM" else "ONE_TIME")
                        put("totalSent", total)
                        put("timestamp", System.currentTimeMillis())
                    }
                    appendPendingEvent(completedEvt)
                    Log.d("AutoSMS", "Task $taskId set to COMPLETED")
                }
            }

            updateNotification("Campaign completed ($total sent)", total, total)
            Thread.sleep(2000)
        } catch (e: Exception) {
            Log.e("AutoSMS", "Batch sending error", e)
        } finally {
            isRunning = false
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun getSmsManagerForSlot(simSlot: Int): SmsManager {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            val subManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            try {
                val subList = subManager?.activeSubscriptionInfoList
                if (subList != null && subList.size > simSlot) {
                    val subId = subList[simSlot].subscriptionId
                    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
                    } else {
                        @Suppress("DEPRECATION")
                        SmsManager.getSmsManagerForSubscriptionId(subId)
                    }
                }
            } catch (e: SecurityException) {
                Log.e("AutoSMS", "Security exception getting subscription", e)
            }
        }
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
    }

    private fun sendSms(smsManager: SmsManager, phone: String, text: String) {
        val sentIntent = Intent(this, SmsStatusReceiver::class.java).apply {
            action = SmsStatusReceiver.ACTION_SMS_SENT
            putExtra(SmsStatusReceiver.EXTRA_PHONE_NUMBER, phone)
        }
        val sentPI = PendingIntent.getBroadcast(
            this,
            phone.hashCode(),
            sentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val deliveredIntent = Intent(this, SmsStatusReceiver::class.java).apply {
            action = SmsStatusReceiver.ACTION_SMS_DELIVERED
            putExtra(SmsStatusReceiver.EXTRA_PHONE_NUMBER, phone)
        }
        val deliveredPI = PendingIntent.getBroadcast(
            this,
            phone.hashCode() + 1,
            deliveredIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val parts = smsManager.divideMessage(text)
        if (parts.size > 1) {
            val sentIntents = ArrayList<PendingIntent>().apply { repeat(parts.size) { add(sentPI) } }
            val deliveredIntents = ArrayList<PendingIntent>().apply { repeat(parts.size) { add(deliveredPI) } }
            smsManager.sendMultipartTextMessage(phone, null, parts, sentIntents, deliveredIntents)
        } else {
            smsManager.sendTextMessage(phone, null, text, sentPI, deliveredPI)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "AutoSMS Background Senders",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows progress of active SMS campaign sending"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String, current: Int, max: Int): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AutoSMS Campaign Running")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setProgress(max, current, false)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String, current: Int, max: Int) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(text, current, max))
    }
}
