package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SessionResponse(
    val id: String,
    val browser: String? = null,
    val os: String? = null,
    @SerialName("device_type") val deviceType: String? = null,
    @SerialName("ip_address") val ipAddress: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("last_activity") val lastActivity: String,
    @SerialName("is_current") val isCurrent: Boolean = false
)

@Serializable
data class SessionListResponse(
    val items: List<SessionResponse>
)
