package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class BackupScheduleResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    val enabled: Boolean,
    val time: String,
    val period: String,
    @SerialName("day_of_week") val dayOfWeek: Int? = null,
    @SerialName("day_of_month") val dayOfMonth: Int? = null,
    @SerialName("last_sent_at") val lastSentAt: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)
