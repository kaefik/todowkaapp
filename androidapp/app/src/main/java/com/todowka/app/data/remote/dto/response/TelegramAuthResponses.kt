package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TelegramLoginResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("token_type") val tokenType: String = "bearer",
    val user: TelegramUserResponse
)

@Serializable
data class TelegramUserResponse(
    val id: Int,
    val email: String,
    val username: String,
    val language: String = "ru",
    val timezone: String = "UTC",
    @SerialName("default_section") val defaultSection: String = "inbox"
)

@Serializable
data class TelegramBindResponse(
    val success: Boolean,
    val message: String = ""
)
