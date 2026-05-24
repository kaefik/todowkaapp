package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ConfigResponse(
    @SerialName("registration_enabled") val registrationEnabled: Boolean,
    @SerialName("max_users") val maxUsers: Int? = null,
    @SerialName("current_users") val currentUsers: Int,
    @SerialName("registration_available") val registrationAvailable: Boolean,
    @SerialName("invite_code_required") val inviteCodeRequired: Boolean
)
