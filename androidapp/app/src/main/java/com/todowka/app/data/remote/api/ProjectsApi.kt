package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.ProjectCreateRequest
import com.todowka.app.data.remote.dto.request.ProjectUpdateRequest
import com.todowka.app.data.remote.dto.request.ReorderRequest
import com.todowka.app.data.remote.dto.response.ProjectDetailResponse
import com.todowka.app.data.remote.dto.response.ProjectListResponse
import com.todowka.app.data.remote.dto.response.ProjectResponse
import com.todowka.app.data.remote.dto.response.TaskListResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface ProjectsApi {

    @GET("api/projects")
    suspend fun getProjects(
        @Query("search") search: String? = null,
        @Query("updated_since") updatedSince: String? = null,
        @Query("limit") limit: Int = 100,
        @Query("offset") offset: Int = 0
    ): Response<ProjectListResponse>

    @PUT("api/projects/reorder")
    suspend fun reorderProjects(@Body request: ReorderRequest): Response<Map<String, Any>>

    @POST("api/projects")
    suspend fun createProject(@Body request: ProjectCreateRequest): Response<ProjectResponse>

    @GET("api/projects/{id}")
    suspend fun getProject(@Path("id") projectId: String): Response<ProjectDetailResponse>

    @PUT("api/projects/{id}")
    suspend fun updateProject(
        @Path("id") projectId: String,
        @Body request: ProjectUpdateRequest
    ): Response<ProjectResponse>

    @DELETE("api/projects/{id}")
    suspend fun deleteProject(@Path("id") projectId: String): Response<Unit>

    @GET("api/projects/{id}/tasks")
    suspend fun getProjectTasks(@Path("id") projectId: String): Response<TaskListResponse>
}
