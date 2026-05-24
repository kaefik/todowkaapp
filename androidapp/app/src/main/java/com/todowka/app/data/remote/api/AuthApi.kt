package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.ChangePasswordRequest
import com.todowka.app.data.remote.dto.request.DeleteAccountRequest
import com.todowka.app.data.remote.dto.request.LoginRequest
import com.todowka.app.data.remote.dto.request.RegisterRequest
import com.todowka.app.data.remote.dto.response.MessageResponse
import com.todowka.app.data.remote.dto.response.TokenResponse
import com.todowka.app.data.remote.dto.response.UserResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface AuthApi {

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<UserResponse>

    @POST("api/auth/login")
    suspend fun login(
        @Body request: LoginRequest,
        @Header("X-Client-Type") clientType: String = "android"
    ): Response<TokenResponse>

    @POST("api/auth/refresh")
    suspend fun refresh(@Header("Authorization") refreshToken: String): Response<TokenResponse>

    @POST("api/auth/logout")
    suspend fun logout(): Response<MessageResponse>

    @GET("api/auth/me")
    suspend fun getMe(): Response<UserResponse>

    @POST("api/auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<MessageResponse>

    @DELETE("api/auth/delete-account")
    suspend fun deleteAccount(@Body request: DeleteAccountRequest): Response<MessageResponse>
}
