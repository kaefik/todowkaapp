package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.TelegramTokenValidateRequest
import com.todowka.app.data.remote.dto.request.UserUpdateRequest
import com.todowka.app.data.remote.dto.response.TelegramTokenValidateResponse
import com.todowka.app.data.remote.dto.response.UserResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

interface UsersApi {

    @GET("api/users")
    suspend fun getUsers(): Response<List<UserResponse>>

    @PATCH("api/users/me")
    suspend fun updateCurrentUser(@Body request: UserUpdateRequest): Response<UserResponse>

    @PATCH("api/users/{id}/block")
    suspend fun blockUser(@Path("id") userId: String): Response<UserResponse>

    @PATCH("api/users/{id}/unblock")
    suspend fun unblockUser(@Path("id") userId: String): Response<UserResponse>

    @DELETE("api/users/{id}")
    suspend fun deleteUser(@Path("id") userId: String): Response<Unit>

    @POST("api/users/telegram/validate-token")
    suspend fun validateTelegramToken(@Body request: TelegramTokenValidateRequest): Response<TelegramTokenValidateResponse>
}
