package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.RevokeAllSessionsRequest
import com.todowka.app.data.remote.dto.response.MessageResponse
import com.todowka.app.data.remote.dto.response.SessionListResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Path

interface SessionsApi {

    @GET("api/sessions")
    suspend fun getSessions(): Response<SessionListResponse>

    @DELETE("api/sessions/{id}")
    suspend fun deleteSession(@Path("id") sessionId: String): Response<MessageResponse>

    @DELETE("api/sessions")
    suspend fun deleteAllSessions(@Body request: RevokeAllSessionsRequest): Response<MessageResponse>
}
