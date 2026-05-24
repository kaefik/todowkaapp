package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UserUpdateRequest(
    val username: String? = null,
    val email: String? = null,
    val timezone: String? = null,
    @SerialName("default_section") val defaultSection: String? = null,
    val language: String? = null,
    val password: String? = null,
    @SerialName("telegram_bot_token") val telegramBotToken: String? = null,
    @SerialName("telegram_notifications_enabled") val telegramNotificationsEnabled: Boolean? = null,
    @SerialName("capitalize_first") val capitalizeFirst: Boolean? = null,
    @SerialName("review_frequency_days") val reviewFrequencyDays: Int? = null,
    @SerialName("review_notifications_enabled") val reviewNotificationsEnabled: Boolean? = null,
    @SerialName("email_notifications_enabled") val emailNotificationsEnabled: Boolean? = null
)

@Serializable
data class TelegramTokenValidateRequest(
    @SerialName("telegram_bot_token") val telegramBotToken: String
)
