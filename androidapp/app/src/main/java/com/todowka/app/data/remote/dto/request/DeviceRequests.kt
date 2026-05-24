package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DeviceRegisterRequest(
    val token: String,
    val platform: String = "android",
    @SerialName("app_version") val appVersion: String? = null
)
