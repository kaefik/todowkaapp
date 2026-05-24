package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UserResponse(
    val id: String,
    val username: String,
    val email: String,
    @SerialName("is_active") val isActive: Boolean,
    @SerialName("is_admin") val isAdmin: Boolean,
    val timezone: String? = null,
    @SerialName("default_section") val defaultSection: String = "inbox",
    val language: String? = null,
    @SerialName("telegram_bot_token") val telegramBotToken: String? = null,
    @SerialName("telegram_chat_id") val telegramChatId: String? = null,
    @SerialName("telegram_notifications_enabled") val telegramNotificationsEnabled: Boolean = false,
    @SerialName("capitalize_first") val capitalizeFirst: Boolean = true,
    @SerialName("last_review_at") val lastReviewAt: String? = null,
    @SerialName("review_count") val reviewCount: Int = 0,
    @SerialName("review_frequency_days") val reviewFrequencyDays: Int = 7,
    @SerialName("review_notifications_enabled") val reviewNotificationsEnabled: Boolean = false,
    @SerialName("email_notifications_enabled") val emailNotificationsEnabled: Boolean = false,
    @SerialName("notification_email") val notificationEmail: String? = null,
    @SerialName("email_verified_at") val emailVerifiedAt: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("last_login_at") val lastLoginAt: String? = null
)

@Serializable
data class TokenResponse(
    val user: UserResponse,
    @SerialName("session_id") val sessionId: String? = null,
    @SerialName("access_token") val accessToken: String? = null,
    @SerialName("refresh_token") val refreshToken: String? = null
)

@Serializable
data class MessageResponse(
    val message: String
)
