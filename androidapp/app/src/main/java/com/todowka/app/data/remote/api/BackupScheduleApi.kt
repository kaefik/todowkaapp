package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.BackupScheduleCreateRequest
import com.todowka.app.data.remote.dto.request.BackupScheduleUpdateRequest
import com.todowka.app.data.remote.dto.response.BackupScheduleResponse
import com.todowka.app.data.remote.dto.response.MessageResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT

interface BackupScheduleApi {

    @GET("api/backup-schedule")
    suspend fun getSchedule(): Response<BackupScheduleResponse>

    @POST("api/backup-schedule")
    suspend fun createSchedule(@Body request: BackupScheduleCreateRequest): Response<BackupScheduleResponse>

    @PUT("api/backup-schedule")
    suspend fun updateSchedule(@Body request: BackupScheduleUpdateRequest): Response<BackupScheduleResponse>

    @DELETE("api/backup-schedule")
    suspend fun deleteSchedule(): Response<Unit>

    @POST("api/backup-schedule/send-now")
    suspend fun sendNow(): Response<MessageResponse>
}
