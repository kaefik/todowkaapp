package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.response.ReviewCompleteResponse
import com.todowka.app.data.remote.dto.response.ReviewStatusResponse
import com.todowka.app.data.remote.dto.response.ReviewSummaryResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.POST

interface ReviewApi {

    @GET("api/review/summary")
    suspend fun getSummary(): Response<ReviewSummaryResponse>

    @GET("api/review/status")
    suspend fun getStatus(): Response<ReviewStatusResponse>

    @POST("api/review/complete")
    suspend fun completeReview(): Response<ReviewCompleteResponse>
}
