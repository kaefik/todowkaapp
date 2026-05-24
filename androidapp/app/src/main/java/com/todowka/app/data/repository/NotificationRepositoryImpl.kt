package com.todowka.app.data.repository

import com.todowka.app.data.remote.api.NotificationsApi
import com.todowka.app.data.remote.dto.response.NotificationListResponse
import com.todowka.app.data.remote.dto.response.NotificationResponse
import com.todowka.app.domain.repository.NotificationRepository

class NotificationRepositoryImpl(
    private val notificationsApi: NotificationsApi
) : NotificationRepository {

    override suspend fun getNotifications(unreadOnly: Boolean?, limit: Int, offset: Int): Result<NotificationListResponse> {
        return try {
            val response = notificationsApi.getNotifications(unreadOnly, limit, offset)
            if (response.isSuccessful) {
                val body = response.body() ?: return Result.failure(Exception("Empty response"))
                Result.success(body)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun markAsRead(notificationId: String): Result<NotificationResponse> {
        return try {
            val response = notificationsApi.markAsRead(notificationId)
            if (response.isSuccessful) {
                val body = response.body() ?: return Result.failure(Exception("Empty response"))
                Result.success(body)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun markAllAsRead(): Result<Unit> {
        return try {
            val response = notificationsApi.markAllAsRead()
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteReadNotifications(): Result<Unit> {
        return try {
            val response = notificationsApi.deleteReadNotifications()
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteNotification(notificationId: String): Result<Unit> {
        return try {
            val response = notificationsApi.deleteNotification(notificationId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
