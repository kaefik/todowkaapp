package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.response.ImportReportResponse
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface ExportImportApi {

    @GET("api/export-import/export")
    suspend fun exportData(): Response<Unit>

    @Multipart
    @POST("api/export-import/import")
    suspend fun importData(@Part file: MultipartBody.Part): Response<ImportReportResponse>
}
