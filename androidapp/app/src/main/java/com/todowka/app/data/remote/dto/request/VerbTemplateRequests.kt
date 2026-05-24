package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.Serializable

@Serializable
data class VerbTemplateCreateRequest(
    val id: String? = null,
    val text: String,
    val icon: String
)

@Serializable
data class VerbTemplateUpdateRequest(
    val text: String? = null,
    val icon: String? = null
)

@Serializable
data class VerbTemplateReorderRequest(
    val ids: List<String>
)
