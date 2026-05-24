package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ReviewSummaryResponse(
    @SerialName("inbox_count") val inboxCount: Int,
    @SerialName("overdue_count") val overdueCount: Int,
    @SerialName("done_this_week") val doneThisWeek: Int,
    @SerialName("stale_count") val staleCount: Int,
    @SerialName("someday_count") val somedayCount: Int = 0,
    @SerialName("projects_without_next") val projectsWithoutNext: Int,
    @SerialName("health_status") val healthStatus: String,
    @SerialName("last_review_date") val lastReviewDate: String? = null,
    @SerialName("review_count") val reviewCount: Int,
    @SerialName("review_frequency_days") val reviewFrequencyDays: Int = 7,
    @SerialName("week_activity") val weekActivity: Map<String, Int> = emptyMap(),
    val alerts: List<ReviewAlertResponse> = emptyList(),
    @SerialName("previous_snapshot") val previousSnapshot: PreviousSnapshotResponse? = null
)

@Serializable
data class ReviewAlertResponse(
    val severity: String,
    val message: String,
    @SerialName("project_id") val projectId: String? = null
)

@Serializable
data class PreviousSnapshotResponse(
    @SerialName("created_at") val createdAt: String,
    @SerialName("inbox_count") val inboxCount: Int,
    @SerialName("overdue_count") val overdueCount: Int,
    @SerialName("done_count") val doneCount: Int,
    @SerialName("stale_count") val staleCount: Int,
    @SerialName("projects_without_next") val projectsWithoutNext: Int,
    @SerialName("health_status") val healthStatus: String
)

@Serializable
data class ReviewStatusResponse(
    @SerialName("inbox_count") val inboxCount: Int,
    @SerialName("inbox_tasks") val inboxTasks: List<TaskReviewItemResponse>,
    @SerialName("overdue_tasks") val overdueTasks: List<OverdueTaskItemResponse> = emptyList(),
    @SerialName("active_projects") val activeProjects: List<ProjectReviewItemResponse>,
    @SerialName("someday_tasks") val somedayTasks: List<TaskReviewItemResponse>,
    @SerialName("last_review_date") val lastReviewDate: String? = null,
    @SerialName("review_count") val reviewCount: Int
)

@Serializable
data class TaskReviewItemResponse(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class OverdueTaskItemResponse(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    @SerialName("gtd_status") val gtdStatus: String,
    @SerialName("project_name") val projectName: String? = null
)

@Serializable
data class ProjectReviewItemResponse(
    val id: String,
    val name: String,
    val description: String? = null,
    @SerialName("has_next_action") val hasNextAction: Boolean,
    @SerialName("days_without_next") val daysWithoutNext: Int = 0,
    @SerialName("next_actions") val nextActions: List<TaskReviewItemResponse> = emptyList(),
    @SerialName("available_tasks") val availableTasks: List<TaskReviewItemResponse> = emptyList()
)

@Serializable
data class ReviewCompleteResponse(
    val success: Boolean,
    @SerialName("review_count") val reviewCount: Int,
    @SerialName("completed_at") val completedAt: String,
    @SerialName("snapshot_health") val snapshotHealth: String? = null
)
