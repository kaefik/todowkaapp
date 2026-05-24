package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.TaskCreateRequest
import com.todowka.app.data.remote.dto.request.TaskMoveRequest
import com.todowka.app.data.remote.dto.request.TaskReorderRequest
import com.todowka.app.data.remote.dto.request.TaskUpdateRequest
import com.todowka.app.data.remote.dto.response.DeletedCountResponse
import com.todowka.app.data.remote.dto.response.GtdCountsResponse
import com.todowka.app.data.remote.dto.response.MessageResponse
import com.todowka.app.data.remote.dto.response.TaskListResponse
import com.todowka.app.data.remote.dto.response.TaskRecurrenceListResponse
import com.todowka.app.data.remote.dto.response.TaskResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface TasksApi {

    @GET("api/tasks/counts")
    suspend fun getCounts(): Response<GtdCountsResponse>

    @GET("api/tasks")
    suspend fun getTasks(
        @Query("gtd_status") gtdStatus: String? = null,
        @Query("context_id") contextId: String? = null,
        @Query("area_id") areaId: String? = null,
        @Query("project_id") projectId: String? = null,
        @Query("tag_id") tagId: String? = null,
        @Query("is_completed") isCompleted: Boolean? = null,
        @Query("due_date_from") dueDateFrom: String? = null,
        @Query("due_date_to") dueDateTo: String? = null,
        @Query("search") search: String? = null,
        @Query("sort_by") sortBy: String = "created_at",
        @Query("sort_order") sortOrder: String = "desc",
        @Query("no_project") noProject: Boolean = false,
        @Query("case_sensitive") caseSensitive: Boolean = false,
        @Query("whole_word") wholeWord: Boolean = false,
        @Query("limit") limit: Int = 100,
        @Query("offset") offset: Int = 0,
        @Query("updated_since") updatedSince: String? = null
    ): Response<TaskListResponse>

    @POST("api/tasks")
    suspend fun createTask(@Body request: TaskCreateRequest): Response<TaskResponse>

    @GET("api/tasks/{id}")
    suspend fun getTask(@Path("id") taskId: String): Response<TaskResponse>

    @PUT("api/tasks/{id}")
    suspend fun updateTask(
        @Path("id") taskId: String,
        @Body request: TaskUpdateRequest
    ): Response<TaskResponse>

    @PATCH("api/tasks/{id}/move")
    suspend fun moveTask(
        @Path("id") taskId: String,
        @Body request: TaskMoveRequest
    ): Response<TaskResponse>

    @PATCH("api/tasks/{id}/reorder")
    suspend fun reorderTask(
        @Path("id") taskId: String,
        @Body request: TaskReorderRequest
    ): Response<TaskResponse>

    @PATCH("api/tasks/{id}/toggle")
    suspend fun toggleTask(@Path("id") taskId: String): Response<TaskResponse>

    @DELETE("api/tasks/completed/clear")
    suspend fun clearCompleted(): Response<DeletedCountResponse>

    @DELETE("api/tasks/trash/clear")
    suspend fun clearTrash(): Response<DeletedCountResponse>

    @DELETE("api/tasks/{id}")
    suspend fun deleteTask(@Path("id") taskId: String): Response<MessageResponse>

    @GET("api/tasks/{id}/recurrences")
    suspend fun getTaskRecurrences(
        @Path("id") taskId: String,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<TaskRecurrenceListResponse>

    @POST("api/tasks/{id}/stop-recurrence")
    suspend fun stopTaskRecurrence(@Path("id") taskId: String): Response<TaskResponse>
}
