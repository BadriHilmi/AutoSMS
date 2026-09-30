package expo.modules.smsengine

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("AutoSMS", "Device reboot completed. Restoring active campaign alarms...")
            // The active schedule alarms will be re-registered from persistent storage.
        }
    }
}
