package com.todowka.app.data.repository

import com.todowka.app.data.remote.api.ReviewApi
import com.todowka.app.data.remote.dto.response.ReviewCompleteResponse
import com.todowka.app.data.remote.dto.response.ReviewStatusResponse
import com.todowka.app.data.remote.dto.response.ReviewSummaryResponse
import com.todowka.app.di.RetrofitProvider
import com.todowka.app.domain.repository.ReviewRepository

class ReviewRepositoryImpl(
    private val retrofitProvider: RetrofitProvider
) : ReviewRepository {

    private val reviewApi: ReviewApi get() = retrofitProvider.getApi(ReviewApi::class)

    override suspend fun getSummary(): Result<ReviewSummaryResponse> {
        return try {
            val response = reviewApi.getSummary()
            if (response.isSuccessful) {
                val body = response.body() ?: return Result.failure(Exception("Empty response"))
                Result.success(body)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getStatus(): Result<ReviewStatusResponse> {
        return try {
            val response = reviewApi.getStatus()
            if (response.isSuccessful) {
                val body = response.body() ?: return Result.failure(Exception("Empty response"))
                Result.success(body)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun completeReview(): Result<ReviewCompleteResponse> {
        return try {
            val response = reviewApi.completeReview()
            if (response.isSuccessful) {
                val body = response.body() ?: return Result.failure(Exception("Empty response"))
                Result.success(body)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
