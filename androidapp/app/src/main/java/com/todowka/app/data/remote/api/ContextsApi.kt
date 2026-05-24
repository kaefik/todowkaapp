package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.ContextCreateRequest
import com.todowka.app.data.remote.dto.request.ContextUpdateRequest
import com.todowka.app.data.remote.dto.response.ContextListResponse
import com.todowka.app.data.remote.dto.response.ContextResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface ContextsApi {

    @GET("api/contexts")
    suspend fun getContexts(
        @Query("search") search: String? = null,
        @Query("updated_since") updatedSince: String? = null
    ): Response<ContextListResponse>

    @POST("api/contexts")
    suspend fun createContext(@Body request: ContextCreateRequest): Response<ContextResponse>

    @GET("api/contexts/{id}")
    suspend fun getContext(@Path("id") contextId: String): Response<ContextResponse>

    @PUT("api/contexts/{id}")
    suspend fun updateContext(
        @Path("id") contextId: String,
        @Body request: ContextUpdateRequest
    ): Response<ContextResponse>

    @DELETE("api/contexts/{id}")
    suspend fun deleteContext(@Path("id") contextId: String): Response<Unit>
}
