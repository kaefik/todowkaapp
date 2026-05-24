package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ContextResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    val name: String,
    val color: String? = null,
    val icon: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
data class ContextListResponse(
    val items: List<ContextResponse>,
    val total: Int
)
