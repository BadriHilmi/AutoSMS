package expo.modules.smsengine

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat

class AlarmReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_PRE_ALERT = "expo.modules.smsengine.ACTION_PRE_ALERT"
        const val EXTRA_PRE_ALERT_TITLE = "extra_pre_alert_title"
        const val EXTRA_PRE_ALERT_COUNT = "extra_pre_alert_count"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_PRE_ALERT) {
            val title = intent.getStringExtra(EXTRA_PRE_ALERT_TITLE) ?: "SMS Campaign"
            val count = intent.getIntExtra(EXTRA_PRE_ALERT_COUNT, 0)
            Log.d("AutoSMS", "Pre-alert alarm triggered for: $title ($count recipients)")
            postPreAlertNotification(context, title, count)
            return
        }

        val taskId = intent.getStringExtra(BatchSmsForegroundService.EXTRA_TASK_ID) ?: ""
        val title = intent.getStringExtra(BatchSmsForegroundService.EXTRA_TITLE) ?: "SMS Campaign"
        val message = intent.getStringExtra(BatchSmsForegroundService.EXTRA_MESSAGE) ?: ""
        val recipientsJson = intent.getStringExtra(BatchSmsForegroundService.EXTRA_RECIPIENTS_JSON) ?: "[]"
        val intervalDelay = intent.getIntExtra(BatchSmsForegroundService.EXTRA_INTERVAL_DELAY, 10)
        val simSlot = intent.getIntExtra(BatchSmsForegroundService.EXTRA_SIM_SLOT, 0)
        val frequency = intent.getStringExtra(BatchSmsForegroundService.EXTRA_FREQUENCY) ?: "ONE_TIME"
        val customRule = intent.getStringExtra(BatchSmsForegroundService.EXTRA_CUSTOM_RULE) ?: ""
        val notificationsEnabled = intent.getBooleanExtra(BatchSmsForegroundService.EXTRA_NOTIFICATIONS_ENABLED, true)
        val preAlertEnabled = intent.getBooleanExtra(BatchSmsForegroundService.EXTRA_PRE_ALERT_ENABLED, true)

        Log.d("AutoSMS", "Alarm triggered for task: $taskId")

        val serviceIntent = Intent(context, BatchSmsForegroundService::class.java).apply {
            putExtra(BatchSmsForegroundService.EXTRA_TASK_ID, taskId)
            putExtra(BatchSmsForegroundService.EXTRA_TITLE, title)
            putExtra(BatchSmsForegroundService.EXTRA_MESSAGE, message)
            putExtra(BatchSmsForegroundService.EXTRA_RECIPIENTS_JSON, recipientsJson)
            putExtra(BatchSmsForegroundService.EXTRA_INTERVAL_DELAY, intervalDelay)
            putExtra(BatchSmsForegroundService.EXTRA_SIM_SLOT, simSlot)
            putExtra(BatchSmsForegroundService.EXTRA_FREQUENCY, frequency)
            putExtra(BatchSmsForegroundService.EXTRA_CUSTOM_RULE, customRule)
            putExtra(BatchSmsForegroundService.EXTRA_NOTIFICATIONS_ENABLED, notificationsEnabled)
            putExtra(BatchSmsForegroundService.EXTRA_PRE_ALERT_ENABLED, preAlertEnabled)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }

    private fun postPreAlertNotification(context: Context, title: String, count: Int) {
        try {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    BatchSmsForegroundService.CHANNEL_ALERTS_ID,
                    "AutoSMS Campaign Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notifications for campaign completion, reminders, and delivery alerts"
                }
                manager.createNotificationChannel(channel)
            }

            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = if (launchIntent != null) {
                PendingIntent.getActivity(
                    context,
                    (System.currentTimeMillis() % 100000).toInt(),
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            } else null

            val text = if (count > 0) {
                "Starting in 5 minutes with $count contacts. Tap to review."
            } else {
                "Starting in 5 minutes. Tap to review."
            }

            val notification = NotificationCompat.Builder(context, BatchSmsForegroundService.CHANNEL_ALERTS_ID)
                .setContentTitle("Upcoming: $title")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()

            val notifId = (System.currentTimeMillis() % 100000).toInt() + 3000
            manager.notify(notifId, notification)
        } catch (e: Exception) {
            Log.e("AutoSMS", "Failed to post pre-alert notification", e)
        }
    }
}
