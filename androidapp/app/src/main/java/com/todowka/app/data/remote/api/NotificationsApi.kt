package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.response.MessageResponse
import com.todowka.app.data.remote.dto.response.NotificationListResponse
import com.todowka.app.data.remote.dto.response.NotificationResponse
import retrofit2.Response
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path
import retrofit2.http.Query

interface NotificationsApi {

    @GET("api/notifications")
    suspend fun getNotifications(
        @Query("unread_only") unreadOnly: Boolean? = null,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<NotificationListResponse>

    @PATCH("api/notifications/{id}/read")
    suspend fun markAsRead(@Path("id") notificationId: String): Response<NotificationResponse>

    @PATCH("api/notifications/read-all")
    suspend fun markAllAsRead(): Response<MessageResponse>

    @DELETE("api/notifications/read")
    suspend fun deleteReadNotifications(): Response<MessageResponse>

    @DELETE("api/notifications/{id}")
    suspend fun deleteNotification(@Path("id") notificationId: String): Response<Unit>
}
