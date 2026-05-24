package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.AreaCreateRequest
import com.todowka.app.data.remote.dto.request.AreaUpdateRequest
import com.todowka.app.data.remote.dto.request.ReorderRequest
import com.todowka.app.data.remote.dto.response.AreaListResponse
import com.todowka.app.data.remote.dto.response.AreaResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface AreasApi {

    @GET("api/areas")
    suspend fun getAreas(
        @Query("search") search: String? = null,
        @Query("updated_since") updatedSince: String? = null,
        @Query("limit") limit: Int = 100,
        @Query("offset") offset: Int = 0
    ): Response<AreaListResponse>

    @PUT("api/areas/reorder")
    suspend fun reorderAreas(@Body request: ReorderRequest): Response<Map<String, Any>>

    @POST("api/areas")
    suspend fun createArea(@Body request: AreaCreateRequest): Response<AreaResponse>

    @GET("api/areas/{id}")
    suspend fun getArea(@Path("id") areaId: String): Response<AreaResponse>

    @PUT("api/areas/{id}")
    suspend fun updateArea(
        @Path("id") areaId: String,
        @Body request: AreaUpdateRequest
    ): Response<AreaResponse>

    @DELETE("api/areas/{id}")
    suspend fun deleteArea(@Path("id") areaId: String): Response<Unit>
}
