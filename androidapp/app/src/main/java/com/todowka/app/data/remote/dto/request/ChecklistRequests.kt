package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ChecklistItemCreateRequest(
    val id: String? = null,
    val title: String,
    val position: Int = 0
)

@Serializable
data class ChecklistItemUpdateRequest(
    val title: String? = null,
    @SerialName("is_completed") val isCompleted: Boolean? = null,
    val position: Int? = null
)
