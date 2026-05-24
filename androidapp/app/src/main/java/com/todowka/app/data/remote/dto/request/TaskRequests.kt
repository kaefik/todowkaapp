package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TaskCreateRequest(
    val id: String? = null,
    val title: String,
    val description: String? = null,
    @SerialName("gtd_status") val gtdStatus: String? = null,
    @SerialName("context_id") val contextId: String? = null,
    @SerialName("area_id") val areaId: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("event_id") val eventId: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    val notes: String? = null,
    @SerialName("tag_ids") val tagIds: List<String>? = null,
    @SerialName("recurrence_type") val recurrenceType: String? = null,
    @SerialName("recurrence_config") val recurrenceConfig: String? = null,
    @SerialName("recurrence_end_date") val recurrenceEndDate: String? = null,
    @SerialName("reminder_time") val reminderTime: String? = null,
    @SerialName("reminder_offsets") val reminderOffsets: List<Int>? = null
)

@Serializable
data class TaskUpdateRequest(
    val title: String? = null,
    val description: String? = null,
    @SerialName("is_completed") val isCompleted: Boolean? = null,
    @SerialName("gtd_status") val gtdStatus: String? = null,
    @SerialName("context_id") val contextId: String? = null,
    @SerialName("area_id") val areaId: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("event_id") val eventId: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    val notes: String? = null,
    @SerialName("tag_ids") val tagIds: List<String>? = null,
    @SerialName("recurrence_type") val recurrenceType: String? = null,
    @SerialName("recurrence_config") val recurrenceConfig: String? = null,
    @SerialName("recurrence_end_date") val recurrenceEndDate: String? = null,
    @SerialName("reminder_time") val reminderTime: String? = null,
    @SerialName("reminder_offsets") val reminderOffsets: List<Int>? = null
)

@Serializable
data class TaskMoveRequest(
    @SerialName("gtd_status") val gtdStatus: String
)

@Serializable
data class TaskReorderRequest(
    val position: Int
)
