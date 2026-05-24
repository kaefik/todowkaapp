package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DeviceTokenResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    val platform: String,
    @SerialName("app_version") val appVersion: String? = null,
    @SerialName("created_at") val createdAt: String
)
