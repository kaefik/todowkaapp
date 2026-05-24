package com.todowka.app.data.remote.dto.request

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RevokeAllSessionsRequest(
    @SerialName("current_session_id") val currentSessionId: String
)
