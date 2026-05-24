package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DeletedEntityResponse(
    @SerialName("entity_type") val entityType: String,
    @SerialName("entity_id") val entityId: String,
    @SerialName("deleted_at") val deletedAt: String
)

@Serializable
data class DeletedEntityListResponse(
    val deleted: List<DeletedEntityResponse>
)
