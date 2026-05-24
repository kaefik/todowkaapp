package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.VerbTemplateCreateRequest
import com.todowka.app.data.remote.dto.request.VerbTemplateReorderRequest
import com.todowka.app.data.remote.dto.request.VerbTemplateUpdateRequest
import com.todowka.app.data.remote.dto.response.VerbTemplateListResponse
import com.todowka.app.data.remote.dto.response.VerbTemplateResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface VerbTemplatesApi {

    @GET("api/verb-templates")
    suspend fun getTemplates(): Response<VerbTemplateListResponse>

    @POST("api/verb-templates")
    suspend fun createTemplate(@Body request: VerbTemplateCreateRequest): Response<VerbTemplateResponse>

    @PUT("api/verb-templates/{id}")
    suspend fun updateTemplate(
        @Path("id") templateId: String,
        @Body request: VerbTemplateUpdateRequest
    ): Response<VerbTemplateResponse>

    @DELETE("api/verb-templates/{id}")
    suspend fun deleteTemplate(@Path("id") templateId: String): Response<Unit>

    @PUT("api/verb-templates/reorder")
    suspend fun reorderTemplates(@Body request: VerbTemplateReorderRequest): Response<List<VerbTemplateResponse>>

    @POST("api/verb-templates/reset")
    suspend fun resetTemplates(): Response<List<VerbTemplateResponse>>
}
