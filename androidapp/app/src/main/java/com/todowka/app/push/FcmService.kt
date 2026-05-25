package com.todowka.app.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.todowka.app.MainActivity
import com.todowka.app.R
import com.todowka.app.data.remote.api.DevicesApi
import com.todowka.app.data.remote.dto.request.DeviceRegisterRequest
import com.todowka.app.di.RetrofitProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.koin.android.ext.android.inject

class FcmService : FirebaseMessagingService() {

    private val retrofitProvider: RetrofitProvider by inject()
    private val devicesApi: DevicesApi get() = retrofitProvider.getApi(DevicesApi::class)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                devicesApi.registerDevice(DeviceRegisterRequest(token = token, platform = "android"))
            } catch (_: Exception) {
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        createNotificationChannels()

        val data = message.data
        val title = data["title"] ?: message.notification?.title ?: "Todowka"
        val body = data["body"] ?: message.notification?.body ?: ""
        val type = data["type"] ?: "task_reminder"

        showNotification(title, body, type)
    }

    private fun showNotification(title: String, body: String, type: String) {
        val channelId = when (type) {
            "deadline", "review_reminder" -> CHANNEL_REMINDERS
            "sync" -> CHANNEL_SYNC
            else -> CHANNEL_TASKS
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("notification_type", type)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun createNotificationChannels() {
        val channels = listOf(
            NotificationChannel(
                CHANNEL_TASKS,
                "Напоминания о задачах",
                NotificationManager.IMPORTANCE_HIGH
            ),
            NotificationChannel(
                CHANNEL_REMINDERS,
                "Напоминания о дедлайнах",
                NotificationManager.IMPORTANCE_HIGH
            ),
            NotificationChannel(
                CHANNEL_SYNC,
                "Синхронизация",
                NotificationManager.IMPORTANCE_LOW
            )
        )

        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        channels.forEach { channel ->
            if (notificationManager.getNotificationChannel(channel.id) == null) {
                notificationManager.createNotificationChannel(channel)
            }
        }
    }

    companion object {
        private const val CHANNEL_TASKS = "tasks"
        private const val CHANNEL_REMINDERS = "reminders"
        private const val CHANNEL_SYNC = "sync"
    }
}
