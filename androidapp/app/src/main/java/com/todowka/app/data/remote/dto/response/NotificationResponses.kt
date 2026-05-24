package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class NotificationResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("task_id") val taskId: String? = null,
    val type: String,
    val message: String,
    @SerialName("is_read") val isRead: Boolean,
    @SerialName("created_at") val createdAt: String,
    @SerialName("delivered_at") val deliveredAt: String? = null,
    @SerialName("read_at") val readAt: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null
)

@Serializable
data class NotificationListResponse(
    val items: List<NotificationResponse>,
    val total: Int,
    @SerialName("unread_count") val unreadCount: Int = 0
)
