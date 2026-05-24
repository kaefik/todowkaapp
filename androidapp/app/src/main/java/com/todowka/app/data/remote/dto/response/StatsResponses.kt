package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.Serializable

@Serializable
data class StatsResponse(
    val total: Int,
    val active: Int,
    val completed: Int,
    @kotlinx.serialization.SerialName("created_week") val createdWeek: Int,
    @kotlinx.serialization.SerialName("created_month") val createdMonth: Int,
    @kotlinx.serialization.SerialName("completed_week") val completedWeek: Int,
    @kotlinx.serialization.SerialName("completed_month") val completedMonth: Int
)
