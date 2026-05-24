package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CalendarEventResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
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
    @SerialName("recurrence_end_date") val recurrenceEndDate: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
data class CalendarEventListResponse(
    val items: List<CalendarEventResponse>,
    val total: Int
)

@Serializable
data class CalendarEventSelectItem(
    val id: String,
    val title: String,
    @SerialName("start_time") val startTime: String
)

@Serializable
data class EventRecurrenceResponse(
    val id: String,
    @SerialName("event_id") val eventId: String,
    @SerialName("generated_event_id") val generatedEventId: String,
    @SerialName("start_time_of_generated_event") val startTimeOfGeneratedEvent: String,
    @SerialName("generated_at") val generatedAt: String,
    val status: String
)

@Serializable
data class EventRecurrenceListResponse(
    val items: List<EventRecurrenceResponse>,
    val total: Int
)
