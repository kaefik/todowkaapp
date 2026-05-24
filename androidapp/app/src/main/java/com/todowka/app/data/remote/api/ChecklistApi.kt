package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.ChecklistItemCreateRequest
import com.todowka.app.data.remote.dto.request.ChecklistItemUpdateRequest
import com.todowka.app.data.remote.dto.response.ChecklistItemListResponse
import com.todowka.app.data.remote.dto.response.ChecklistItemResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ChecklistApi {

    @GET("api/tasks/checklist/all")
    suspend fun getAllChecklistItems(
        @Query("updated_since") updatedSince: String? = null
    ): Response<ChecklistItemListResponse>

    @GET("api/tasks/{taskId}/checklist")
    suspend fun getChecklist(@Path("taskId") taskId: String): Response<List<ChecklistItemResponse>>

    @POST("api/tasks/{taskId}/checklist")
    suspend fun createChecklistItem(
        @Path("taskId") taskId: String,
        @Body request: ChecklistItemCreateRequest
    ): Response<ChecklistItemResponse>

    @PATCH("api/tasks/{taskId}/checklist/{itemId}")
    suspend fun updateChecklistItem(
        @Path("taskId") taskId: String,
        @Path("itemId") itemId: String,
        @Body request: ChecklistItemUpdateRequest
    ): Response<ChecklistItemResponse>

    @DELETE("api/tasks/{taskId}/checklist/{itemId}")
    suspend fun deleteChecklistItem(
        @Path("taskId") taskId: String,
        @Path("itemId") itemId: String
    ): Response<Unit>
}
