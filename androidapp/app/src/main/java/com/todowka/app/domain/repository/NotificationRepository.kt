package com.todowka.app.domain.repository

import com.todowka.app.data.remote.dto.response.NotificationListResponse
import com.todowka.app.data.remote.dto.response.NotificationResponse

interface NotificationRepository {
    suspend fun getNotifications(unreadOnly: Boolean? = null, limit: Int = 50, offset: Int = 0): Result<NotificationListResponse>
    suspend fun markAsRead(notificationId: String): Result<NotificationResponse>
    suspend fun markAllAsRead(): Result<Unit>
    suspend fun deleteReadNotifications(): Result<Unit>
    suspend fun deleteNotification(notificationId: String): Result<Unit>
}
