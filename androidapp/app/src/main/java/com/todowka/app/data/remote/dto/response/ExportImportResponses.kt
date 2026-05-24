package com.todowka.app.data.remote.dto.response

import kotlinx.serialization.Serializable

@Serializable
data class ImportReportResponse(
    val imported: Map<String, Int>,
    val skipped: Int,
    val errors: List<String>
)
