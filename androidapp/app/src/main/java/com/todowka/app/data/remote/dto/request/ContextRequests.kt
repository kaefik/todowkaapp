package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ContextCreateRequest(
    val id: String? = null,
    val name: String,
    val color: String? = null,
    val icon: String? = null
)

@Serializable
data class ContextUpdateRequest(
    val name: String? = null,
    val color: String? = null,
    val icon: String? = null
)
