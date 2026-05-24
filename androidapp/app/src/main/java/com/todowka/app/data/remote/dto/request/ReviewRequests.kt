package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.Serializable

@Serializable
data class BackupScheduleCreateRequest(
    val enabled: Boolean = true,
    val time: String,
    val period: String = "daily",
    @kotlinx.serialization.SerialName("day_of_week") val dayOfWeek: Int? = null,
    @kotlinx.serialization.SerialName("day_of_month") val dayOfMonth: Int? = null
)

@Serializable
data class BackupScheduleUpdateRequest(
    val enabled: Boolean? = null,
    val time: String? = null,
    val period: String? = null,
    @kotlinx.serialization.SerialName("day_of_week") val dayOfWeek: Int? = null,
    @kotlinx.serialization.SerialName("day_of_month") val dayOfMonth: Int? = null
)
