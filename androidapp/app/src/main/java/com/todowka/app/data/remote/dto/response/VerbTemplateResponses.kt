package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class VerbTemplateResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    val text: String,
    val icon: String,
    val position: Int,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
data class VerbTemplateListResponse(
    val items: List<VerbTemplateResponse>,
    val total: Int
)
