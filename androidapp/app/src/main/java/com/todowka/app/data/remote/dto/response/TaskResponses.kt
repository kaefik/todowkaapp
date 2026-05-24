package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TaskResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    val title: String,
    val description: String? = null,
    @SerialName("is_completed") val isCompleted: Boolean = false,
    @SerialName("completed_at") val completedAt: String? = null,
    @SerialName("gtd_status") val gtdStatus: String,
    @SerialName("context_id") val contextId: String? = null,
    @SerialName("area_id") val areaId: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("event_id") val eventId: String? = null,
    val position: Int = 0,
    @SerialName("due_date") val dueDate: String? = null,
    val notes: String? = null,
    @SerialName("recurrence_type") val recurrenceType: String? = null,
    @SerialName("recurrence_config") val recurrenceConfig: String? = null,
    @SerialName("recurrence_end_date") val recurrenceEndDate: String? = null,
    @SerialName("reminder_time") val reminderTime: String? = null,
    @SerialName("reminder_offsets") val reminderOffsets: List<Int>? = null,
    @SerialName("reminder_fired") val reminderFired: Boolean = false,
    @SerialName("last_reminder_sent_at") val lastReminderSentAt: String? = null,
    @SerialName("is_recurring") val isRecurring: Boolean = false,
    val tags: List<TagBriefResponse> = emptyList(),
    val project: ProjectBriefResponse? = null,
    val context: ContextBriefResponse? = null,
    @SerialName("checklist_total") val checklistTotal: Int = 0,
    @SerialName("checklist_completed") val checklistCompleted: Int = 0,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
data class TagBriefResponse(
    val id: String,
    val name: String,
    val color: String? = null
)

@Serializable
data class ProjectBriefResponse(
    val id: String,
    val name: String,
    val color: String? = null,
    @SerialName("is_active") val isActive: Boolean
)

@Serializable
data class ContextBriefResponse(
    val id: String,
    val name: String,
    val color: String? = null,
    val icon: String? = null
)

@Serializable
data class TaskListResponse(
    val items: List<TaskResponse>,
    val total: Int
)

@Serializable
data class GtdCountsResponse(
    val inbox: Int = 0,
    val active: Int = 0,
    val next: Int = 0,
    val waiting: Int = 0,
    val someday: Int = 0,
    val completed: Int = 0,
    val trash: Int = 0
)

@Serializable
data class TaskRecurrenceResponse(
    val id: String,
    @SerialName("task_id") val taskId: String,
    @SerialName("generated_task_id") val generatedTaskId: String,
    @SerialName("due_date_of_generated_task") val dueDateOfGeneratedTask: String,
    @SerialName("generated_at") val generatedAt: String,
    val status: String
)

@Serializable
data class TaskRecurrenceListResponse(
    val items: List<TaskRecurrenceResponse>,
    val total: Int
)

@Serializable
data class DeletedCountResponse(
    val deleted: Int
)
