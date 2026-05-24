package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.TagCreateRequest
import com.todowka.app.data.remote.dto.request.TagUpdateRequest
import com.todowka.app.data.remote.dto.response.TagListResponse
import com.todowka.app.data.remote.dto.response.TagResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface TagsApi {

    @GET("api/tags")
    suspend fun getTags(
        @Query("search") search: String? = null,
        @Query("updated_since") updatedSince: String? = null
    ): Response<TagListResponse>

    @POST("api/tags")
    suspend fun createTag(@Body request: TagCreateRequest): Response<TagResponse>

    @GET("api/tags/{id}")
    suspend fun getTag(@Path("id") tagId: String): Response<TagResponse>

    @PUT("api/tags/{id}")
    suspend fun updateTag(
        @Path("id") tagId: String,
        @Body request: TagUpdateRequest
    ): Response<TagResponse>

    @DELETE("api/tags/{id}")
    suspend fun deleteTag(@Path("id") tagId: String): Response<Unit>
}
