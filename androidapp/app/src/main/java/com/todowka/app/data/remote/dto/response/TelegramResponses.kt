package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.Serializable

@Serializable
data class TelegramTokenValidateResponse(
    val valid: Boolean,
    val bot_username: String? = null,
    val bot_name: String? = null,
    val error: String? = null
)
