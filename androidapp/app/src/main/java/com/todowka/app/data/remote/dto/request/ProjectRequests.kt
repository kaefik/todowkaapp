package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ProjectCreateRequest(
    val id: String? = null,
    val name: String,
    val description: String? = null,
    val color: String? = null,
    @SerialName("area_id") val areaId: String? = null,
    @SerialName("sort_order") val sortOrder: Int? = null
)

@Serializable
data class ProjectUpdateRequest(
    val name: String? = null,
    val description: String? = null,
    val color: String? = null,
    @SerialName("area_id") val areaId: String? = null,
    @SerialName("is_active") val isActive: Boolean? = null,
    @SerialName("sort_order") val sortOrder: Int? = null
)

@Serializable
data class ReorderItem(
    val id: String,
    @SerialName("sort_order") val sortOrder: Int
)

@Serializable
data class ReorderRequest(
    val items: List<ReorderItem>
)
