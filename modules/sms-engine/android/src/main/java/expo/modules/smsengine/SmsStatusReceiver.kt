package expo.modules.smsengine

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import android.util.Log

class SmsStatusReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_SMS_SENT = "expo.modules.smsengine.SMS_SENT"
        const val ACTION_SMS_DELIVERED = "expo.modules.smsengine.SMS_DELIVERED"
        const val EXTRA_LOG_ID = "extra_log_id"
        const val EXTRA_PHONE_NUMBER = "extra_phone_number"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val logId = intent.getStringExtra(EXTRA_LOG_ID) ?: ""
        val phone = intent.getStringExtra(EXTRA_PHONE_NUMBER) ?: ""

        when (intent.action) {
            ACTION_SMS_SENT -> {
                when (resultCode) {
                    Activity.RESULT_OK -> {
                        Log.d("AutoSMS", "SMS Sent successfully to $phone (Log: $logId)")
                    }
                    SmsManager.RESULT_ERROR_GENERIC_FAILURE -> {
                        Log.e("AutoSMS", "SMS Generic failure for $phone")
                    }
                    SmsManager.RESULT_ERROR_NO_SERVICE -> {
                        Log.e("AutoSMS", "SMS No cellular service for $phone")
                    }
                    SmsManager.RESULT_ERROR_RADIO_OFF -> {
                        Log.e("AutoSMS", "SMS Radio/Airplane mode off for $phone")
                    }
                    else -> {
                        Log.e("AutoSMS", "SMS Failed with code $resultCode for $phone")
                    }
                }
            }
            ACTION_SMS_DELIVERED -> {
                when (resultCode) {
                    Activity.RESULT_OK -> {
                        Log.d("AutoSMS", "SMS Delivered confirmed for $phone")
                    }
                    Activity.RESULT_CANCELED -> {
                        Log.e("AutoSMS", "SMS Delivery not confirmed for $phone")
                    }
                }
            }
        }
    }
}
