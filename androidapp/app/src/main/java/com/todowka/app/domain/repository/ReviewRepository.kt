package com.todowka.app.domain.repository

import com.todowka.app.data.remote.dto.response.ReviewCompleteResponse
import com.todowka.app.data.remote.dto.response.ReviewStatusResponse
import com.todowka.app.data.remote.dto.response.ReviewSummaryResponse

interface ReviewRepository {
    suspend fun getSummary(): Result<ReviewSummaryResponse>
    suspend fun getStatus(): Result<ReviewStatusResponse>
    suspend fun completeReview(): Result<ReviewCompleteResponse>
}
