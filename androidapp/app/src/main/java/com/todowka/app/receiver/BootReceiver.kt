package com.todowka.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.service.ReminderScheduler
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

class BootReceiver : BroadcastReceiver(), KoinComponent {

    private val authPreferences: AuthPreferences by inject()

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val userId = authPreferences.currentUserId ?: return
        val scheduler = ReminderScheduler(context)
        scheduler.rescheduleAll(userId)
    }
}
