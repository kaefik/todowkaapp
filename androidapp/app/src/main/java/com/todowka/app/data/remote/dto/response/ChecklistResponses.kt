package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ChecklistItemResponse(
    val id: String,
    @SerialName("task_id") val taskId: String,
    val title: String,
    @SerialName("is_completed") val isCompleted: Boolean,
    val position: Int,
    @SerialName("completed_at") val completedAt: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
data class ChecklistItemListResponse(
    val items: List<ChecklistItemResponse>,
    val total: Int
)
