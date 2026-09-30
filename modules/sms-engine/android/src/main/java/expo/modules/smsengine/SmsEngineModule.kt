package expo.modules.smsengine

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsEngineModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("SmsEngineModule")

        AsyncFunction("sendDirectSms") { options: Map<String, Any> ->
            val context = appContext.reactContext ?: throw Exception("React context unavailable")
            val phone = options["phoneNumber"] as? String ?: throw Exception("Phone number missing")
            val message = options["message"] as? String ?: throw Exception("Message missing")
            val simSlot = (options["simSlot"] as? Number)?.toInt() ?: 0

            val smsManager = getSmsManagerForSlot(context, simSlot)
            
            val sentIntent = Intent(context, SmsStatusReceiver::class.java).apply {
                action = SmsStatusReceiver.ACTION_SMS_SENT
                putExtra(SmsStatusReceiver.EXTRA_PHONE_NUMBER, phone)
            }
            val sentPI = PendingIntent.getBroadcast(
                context,
                phone.hashCode(),
                sentIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                val sentIntents = ArrayList<PendingIntent>().apply { repeat(parts.size) { add(sentPI) } }
                smsManager.sendMultipartTextMessage(phone, null, parts, sentIntents, null)
            } else {
                smsManager.sendTextMessage(phone, null, message, sentPI, null)
            }

            mapOf("success" to true, "messageId" to "msg_${System.currentTimeMillis()}")
        }

        AsyncFunction("getAvailableSimSlots") {
            val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
            val result = mutableListOf<Map<String, Any>>()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
                try {
                    val subList = subManager?.activeSubscriptionInfoList
                    subList?.forEachIndexed { index, info ->
                        result.add(
                            mapOf(
                                "slotIndex" to info.simSlotIndex,
                                "subscriptionId" to info.subscriptionId,
                                "carrierName" to (info.carrierName?.toString() ?: "SIM ${index + 1}"),
                                "displayName" to (info.displayName?.toString() ?: "SIM ${index + 1}"),
                                "countryIso" to (info.countryIso ?: "")
                            )
                        )
                    }
                } catch (e: SecurityException) {
                    // Fallback
                }
            }

            if (result.isEmpty()) {
                result.add(
                    mapOf(
                        "slotIndex" to 0,
                        "subscriptionId" to 1,
                        "carrierName" to "Default SIM",
                        "displayName" to "SIM 1",
                        "countryIso" to ""
                    )
                )
            }

            result
        }

        AsyncFunction("isDualSim") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? android.telephony.TelephonyManager
            if (telephonyManager != null) {
                val modemCount = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    telephonyManager.activeModemCount
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    telephonyManager.phoneCount
                } else {
                    1
                }
                if (modemCount <= 1) {
                    return@AsyncFunction false
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
                try {
                    val subList = subManager?.activeSubscriptionInfoList
                    return@AsyncFunction (subList != null && subList.size > 1)
                } catch (e: SecurityException) {
                    return@AsyncFunction false
                }
            }
            false
        }

        AsyncFunction("scheduleAlarmTask") { options: Map<String, Any> ->
            val context = appContext.reactContext ?: throw Exception("React context unavailable")
            val taskId = options["taskId"] as? String ?: "task_${System.currentTimeMillis()}"
            val timestamp = (options["timestamp"] as? Number)?.toLong() ?: System.currentTimeMillis()
            val message = options["message"] as? String ?: ""
            val recipientsJson = options["recipientsJson"] as? String ?: "[]"
            val intervalDelaySec = (options["intervalDelaySec"] as? Number)?.toInt() ?: 10
            val simSlot = (options["simSlot"] as? Number)?.toInt() ?: 0
            val frequency = options["frequency"] as? String ?: "ONE_TIME"
            val customRule = options["customRule"] as? String ?: ""

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra(BatchSmsForegroundService.EXTRA_TASK_ID, taskId)
                putExtra(BatchSmsForegroundService.EXTRA_MESSAGE, message)
                putExtra(BatchSmsForegroundService.EXTRA_RECIPIENTS_JSON, recipientsJson)
                putExtra(BatchSmsForegroundService.EXTRA_INTERVAL_DELAY, intervalDelaySec)
                putExtra(BatchSmsForegroundService.EXTRA_SIM_SLOT, simSlot)
                putExtra(BatchSmsForegroundService.EXTRA_FREQUENCY, frequency)
                putExtra(BatchSmsForegroundService.EXTRA_CUSTOM_RULE, customRule)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                taskId.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent)
                    } else {
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent)
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent)
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent)
                }
            } catch (e: Exception) {
                android.util.Log.w("AutoSMS", "Exact alarm fallback to standard alarm", e)
                alarmManager.set(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent)
            }

            true
        }

        AsyncFunction("runCampaignNow") { options: Map<String, Any> ->
            val context = appContext.reactContext ?: throw Exception("React context unavailable")
            val taskId = options["taskId"] as? String ?: "task_${System.currentTimeMillis()}"
            val message = options["message"] as? String ?: ""
            val recipientsJson = options["recipientsJson"] as? String ?: "[]"
            val intervalDelaySec = (options["intervalDelaySec"] as? Number)?.toInt() ?: 10
            val simSlot = (options["simSlot"] as? Number)?.toInt() ?: 0
            val frequency = options["frequency"] as? String ?: "ONE_TIME"
            val customRule = options["customRule"] as? String ?: ""

            val serviceIntent = Intent(context, BatchSmsForegroundService::class.java).apply {
                putExtra(BatchSmsForegroundService.EXTRA_TASK_ID, taskId)
                putExtra(BatchSmsForegroundService.EXTRA_MESSAGE, message)
                putExtra(BatchSmsForegroundService.EXTRA_RECIPIENTS_JSON, recipientsJson)
                putExtra(BatchSmsForegroundService.EXTRA_INTERVAL_DELAY, intervalDelaySec)
                putExtra(BatchSmsForegroundService.EXTRA_SIM_SLOT, simSlot)
                putExtra(BatchSmsForegroundService.EXTRA_FREQUENCY, frequency)
                putExtra(BatchSmsForegroundService.EXTRA_CUSTOM_RULE, customRule)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            true
        }

        AsyncFunction("getPendingEvents") {
            val context = appContext.reactContext ?: return@AsyncFunction "[]"
            val prefs = context.getSharedPreferences(BatchSmsForegroundService.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.getString(BatchSmsForegroundService.KEY_PENDING_EVENTS, "[]") ?: "[]"
        }

        AsyncFunction("clearPendingEvents") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            val prefs = context.getSharedPreferences(BatchSmsForegroundService.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().remove(BatchSmsForegroundService.KEY_PENDING_EVENTS).apply()
            true
        }

        AsyncFunction("cancelAlarmTask") { taskId: String ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                taskId.hashCode(),
                intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
            }
            true
        }

        AsyncFunction("requestIgnoreBatteryOptimizations") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                val packageName = context.packageName
                if (powerManager != null && !powerManager.isIgnoringBatteryOptimizations(packageName)) {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                    return@AsyncFunction true
                }
            }
            false
        }
    }

    private fun getSmsManagerForSlot(context: Context, simSlot: Int): SmsManager {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            try {
                val subList = subManager?.activeSubscriptionInfoList
                if (subList != null && subList.size > simSlot) {
                    val subId = subList[simSlot].subscriptionId
                    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        context.getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
                    } else {
                        @Suppress("DEPRECATION")
                        SmsManager.getSmsManagerForSubscriptionId(subId)
                    }
                }
            } catch (e: SecurityException) {
                // Ignore
            }
        }
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            context.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
    }
}
