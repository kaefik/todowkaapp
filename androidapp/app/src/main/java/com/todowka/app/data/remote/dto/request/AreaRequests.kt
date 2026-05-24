package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AreaCreateRequest(
    val id: String? = null,
    val name: String,
    val description: String? = null,
    val color: String? = null,
    @SerialName("sort_order") val sortOrder: Int? = null
)

@Serializable
data class AreaUpdateRequest(
    val name: String? = null,
    val description: String? = null,
    val color: String? = null,
    @SerialName("sort_order") val sortOrder: Int? = null
)
