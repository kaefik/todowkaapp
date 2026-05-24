package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.DeviceRegisterRequest
import com.todowka.app.data.remote.dto.response.DeviceTokenResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.POST
import retrofit2.http.Path

interface DevicesApi {

    @POST("api/devices/register")
    suspend fun registerDevice(@Body request: DeviceRegisterRequest): Response<DeviceTokenResponse>

    @DELETE("api/devices/{id}")
    suspend fun deleteDevice(@Path("id") deviceId: String): Response<Unit>
}
