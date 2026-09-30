package expo.modules.smsengine

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra(BatchSmsForegroundService.EXTRA_TASK_ID) ?: ""
        val message = intent.getStringExtra(BatchSmsForegroundService.EXTRA_MESSAGE) ?: ""
        val recipientsJson = intent.getStringExtra(BatchSmsForegroundService.EXTRA_RECIPIENTS_JSON) ?: "[]"
        val intervalDelay = intent.getIntExtra(BatchSmsForegroundService.EXTRA_INTERVAL_DELAY, 10)
        val simSlot = intent.getIntExtra(BatchSmsForegroundService.EXTRA_SIM_SLOT, 0)
        val frequency = intent.getStringExtra(BatchSmsForegroundService.EXTRA_FREQUENCY) ?: "ONE_TIME"
        val customRule = intent.getStringExtra(BatchSmsForegroundService.EXTRA_CUSTOM_RULE) ?: ""

        Log.d("AutoSMS", "Alarm triggered for task: $taskId")

        val serviceIntent = Intent(context, BatchSmsForegroundService::class.java).apply {
            putExtra(BatchSmsForegroundService.EXTRA_TASK_ID, taskId)
            putExtra(BatchSmsForegroundService.EXTRA_MESSAGE, message)
            putExtra(BatchSmsForegroundService.EXTRA_RECIPIENTS_JSON, recipientsJson)
            putExtra(BatchSmsForegroundService.EXTRA_INTERVAL_DELAY, intervalDelay)
            putExtra(BatchSmsForegroundService.EXTRA_SIM_SLOT, simSlot)
            putExtra(BatchSmsForegroundService.EXTRA_FREQUENCY, frequency)
            putExtra(BatchSmsForegroundService.EXTRA_CUSTOM_RULE, customRule)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
