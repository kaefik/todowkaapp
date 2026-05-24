package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.Serializable

@Serializable
data class TagCreateRequest(
    val id: String? = null,
    val name: String,
    val color: String? = null
)

@Serializable
data class TagUpdateRequest(
    val name: String? = null,
    val color: String? = null
)
