package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TagResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    val name: String,
    val color: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
data class TagListResponse(
    val items: List<TagResponse>,
    val total: Int
)
