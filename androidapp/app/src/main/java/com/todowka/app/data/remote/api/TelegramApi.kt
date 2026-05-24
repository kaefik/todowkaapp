package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.LoginRequest
import com.todowka.app.data.remote.dto.response.MessageResponse
import com.todowka.app.data.remote.dto.response.TelegramBindResponse
import com.todowka.app.data.remote.dto.response.TelegramLoginResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface TelegramApi {

    @POST("api/telegram/login")
    suspend fun login(@Body request: LoginRequest): Response<TelegramLoginResponse>

    @POST("api/telegram/bind")
    suspend fun bind(@Body request: LoginRequest): Response<TelegramBindResponse>

    @GET("api/telegram/bind-link")
    suspend fun getBindLink(): Response<Map<String, String>>

    @POST("api/telegram/logout")
    suspend fun logout(): Response<MessageResponse>
}
