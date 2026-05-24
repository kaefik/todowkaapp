package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AreaResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    val name: String,
    val description: String? = null,
    val color: String? = null,
    @SerialName("sort_order") val sortOrder: Int,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
data class AreaListResponse(
    val items: List<AreaResponse>,
    val total: Int
)
