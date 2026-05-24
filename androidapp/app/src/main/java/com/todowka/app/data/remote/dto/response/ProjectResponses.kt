package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ProjectResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("area_id") val areaId: String? = null,
    val name: String,
    val description: String? = null,
    val color: String? = null,
    @SerialName("is_active") val isActive: Boolean,
    @SerialName("sort_order") val sortOrder: Int,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
data class ProjectDetailResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("area_id") val areaId: String? = null,
    val name: String,
    val description: String? = null,
    val color: String? = null,
    @SerialName("is_active") val isActive: Boolean,
    @SerialName("sort_order") val sortOrder: Int,
    val progress: ProjectProgressResponse,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
data class ProjectProgressResponse(
    @SerialName("tasks_total") val tasksTotal: Int,
    @SerialName("tasks_completed") val tasksCompleted: Int,
    @SerialName("progress_percent") val progressPercent: Float
)

@Serializable
data class ProjectListResponse(
    val items: List<ProjectDetailResponse>,
    val total: Int
)
