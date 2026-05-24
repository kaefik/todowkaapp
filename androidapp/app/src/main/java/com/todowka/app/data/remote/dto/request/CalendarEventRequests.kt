package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CalendarEventCreateRequest(
    val id: String? = null,
    val title: String,
    val description: String? = null,
    @SerialName("start_time") val startTime: String,
    @SerialName("end_time") val endTime: String? = null,
    @SerialName("all_day") val allDay: Boolean = false,
    val color: String? = null,
    val location: String? = null,
    val attendees: List<String>? = null,
    @SerialName("recurrence_type") val recurrenceType: String? = null,
    @SerialName("recurrence_config") val recurrenceConfig: String? = null,
    @SerialName("recurrence_end_date") val recurrenceEndDate: String? = null
)

@Serializable
data class CalendarEventUpdateRequest(
    val title: String? = null,
    val description: String? = null,
    @SerialName("start_time") val startTime: String? = null,
    @SerialName("end_time") val endTime: String? = null,
    @SerialName("all_day") val allDay: Boolean? = null,
    val color: String? = null,
    val location: String? = null,
    val attendees: List<String>? = null,
    @SerialName("recurrence_type") val recurrenceType: String? = null,
    @SerialName("recurrence_config") val recurrenceConfig: String? = null,
    @SerialName("recurrence_end_date") val recurrenceEndDate: String? = null
)
