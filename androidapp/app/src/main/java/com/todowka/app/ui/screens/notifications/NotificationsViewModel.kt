package com.todowka.app.ui.screens.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.remote.dto.response.NotificationResponse
import com.todowka.app.domain.repository.NotificationRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class NotificationsState(
    val notifications: List<NotificationResponse> = emptyList(),
    val unreadCount: Int = 0,
    val isLoading: Boolean = true,
    val error: String? = null
)

class NotificationsViewModel(
    private val notificationRepository: NotificationRepository
) : ViewModel() {

    private val _state = MutableStateFlow(NotificationsState())
    val state: StateFlow<NotificationsState> = _state.asStateFlow()

    init {
        loadNotifications()
    }

    fun loadNotifications() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val result = notificationRepository.getNotifications(unreadOnly = false)
            if (result.isSuccess) {
                val response = result.getOrNull()!!
                _state.value = _state.value.copy(
                    notifications = response.items,
                    unreadCount = response.unreadCount,
                    isLoading = false,
                    error = null
                )
            } else {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = result.exceptionOrNull()?.message
                )
            }
        }
    }

    fun markAsRead(notificationId: String) {
        viewModelScope.launch {
            notificationRepository.markAsRead(notificationId)
            _state.value = _state.value.copy(
                notifications = _state.value.notifications.map {
                    if (it.id == notificationId) it.copy(isRead = true) else it
                },
                unreadCount = (_state.value.unreadCount - 1).coerceAtLeast(0)
            )
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            notificationRepository.markAllAsRead()
            _state.value = _state.value.copy(
                notifications = _state.value.notifications.map { it.copy(isRead = true) },
                unreadCount = 0
            )
        }
    }

    fun deleteNotification(notificationId: String) {
        viewModelScope.launch {
            notificationRepository.deleteNotification(notificationId)
            val updated = _state.value.notifications.filter { it.id != notificationId }
            _state.value = _state.value.copy(notifications = updated)
        }
    }
}
