package com.todowka.app.service

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.todowka.app.receiver.ReminderReceiver
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

class ReminderScheduler(private val context: Context) {

    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun scheduleReminder(taskId: String, title: String, reminderTime: LocalTime, dueDate: LocalDate) {
        val dateTime = LocalDateTime.of(dueDate, reminderTime)
        val triggerMillis = dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

        if (triggerMillis <= System.currentTimeMillis()) return

        scheduleAlarm(taskId, title, triggerMillis, REQUEST_CODE_REMINDER)
    }

    fun scheduleOffsetReminder(taskId: String, title: String, dueDateTime: LocalDateTime, offsetMinutes: Int) {
        val triggerTime = dueDateTime.minusMinutes(offsetMinutes.toLong())
        val triggerMillis = triggerTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

        if (triggerMillis <= System.currentTimeMillis()) return

        scheduleAlarm(taskId, title, triggerMillis, REQUEST_CODE_OFFSET + offsetMinutes)
    }

    fun cancelReminder(taskId: String) {
        val baseIntent = createIntent(taskId, "")
        val flags = PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE

        for (requestCode in listOf(REQUEST_CODE_REMINDER, REQUEST_CODE_OFFSET + 5, REQUEST_CODE_OFFSET + 15, REQUEST_CODE_OFFSET + 30, REQUEST_CODE_OFFSET + 60, REQUEST_CODE_OFFSET + 1440)) {
            val pendingIntent = PendingIntent.getBroadcast(context, "${taskId}_$requestCode".hashCode(), baseIntent, flags)
            pendingIntent?.let { alarmManager.cancel(it) }
        }
    }

    fun rescheduleAll(userId: String) {
    }

    private fun scheduleAlarm(taskId: String, title: String, triggerMillis: Long, requestCodeBase: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerMillis,
                    createPendingIntent(taskId, title, requestCodeBase)
                )
                return
            }
        }

        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerMillis,
            createPendingIntent(taskId, title, requestCodeBase)
        )
    }

    private fun createPendingIntent(taskId: String, title: String, requestCodeBase: Int): PendingIntent {
        val intent = createIntent(taskId, title)
        return PendingIntent.getBroadcast(
            context,
            "${taskId}_$requestCodeBase".hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun createIntent(taskId: String, title: String): Intent {
        return Intent(context, ReminderReceiver::class.java).apply {
            action = ACTION_REMINDER
            putExtra(EXTRA_TASK_ID, taskId)
            putExtra(EXTRA_TITLE, title)
        }
    }

    companion object {
        const val ACTION_REMINDER = "com.todowka.app.REMINDER"
        const val EXTRA_TASK_ID = "task_id"
        const val EXTRA_TITLE = "title"

        private const val REQUEST_CODE_REMINDER = 1000
        private const val REQUEST_CODE_OFFSET = 2000
    }
}
