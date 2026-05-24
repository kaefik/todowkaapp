package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.response.ConfigResponse
import com.todowka.app.data.remote.dto.response.DeletedEntityListResponse
import com.todowka.app.data.remote.dto.response.StatsResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface ConfigApi {

    @GET("api/config")
    suspend fun getConfig(): Response<ConfigResponse>

    @GET("api/stats")
    suspend fun getStats(): Response<StatsResponse>

    @GET("api/deleted")
    suspend fun getDeleted(
        @Query("since") since: String? = null,
        @Query("entity_type") entityType: String? = null
    ): Response<DeletedEntityListResponse>
}
