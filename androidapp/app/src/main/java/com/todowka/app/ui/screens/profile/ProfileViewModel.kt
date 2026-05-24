package com.todowka.app.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.remote.dto.response.UserResponse
import com.todowka.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ProfileState(
    val user: UserResponse? = null,
    val isLoading: Boolean = true,
    val isEditing: Boolean = false,
    val error: String? = null,
    val passwordError: String? = null,
    val deleteError: String? = null
)

class ProfileViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileState())
    val state: StateFlow<ProfileState> = _state.asStateFlow()

    init {
        loadUser()
    }

    private fun loadUser() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val result = authRepository.getCurrentUser()
            if (result.isSuccess) {
                _state.value = _state.value.copy(user = result.getOrNull(), isLoading = false)
            } else {
                _state.value = _state.value.copy(error = result.exceptionOrNull()?.message, isLoading = false)
            }
        }
    }

    fun updateProfile(username: String, email: String, timezone: String?, language: String?) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val result = authRepository.getCurrentUser()
            if (result.isSuccess) {
                _state.value = _state.value.copy(user = result.getOrNull(), isEditing = false, isLoading = false)
            } else {
                _state.value = _state.value.copy(error = result.exceptionOrNull()?.message, isLoading = false)
            }
        }
    }

    fun changePassword(current: String, new: String) {
        viewModelScope.launch {
            val result = authRepository.changePassword(current, new)
            if (result.isFailure) {
                _state.value = _state.value.copy(passwordError = result.exceptionOrNull()?.message)
            } else {
                _state.value = _state.value.copy(passwordError = null)
            }
        }
    }

    fun deleteAccount(password: String) {
        viewModelScope.launch {
            val result = authRepository.deleteAccount(password)
            if (result.isFailure) {
                _state.value = _state.value.copy(deleteError = result.exceptionOrNull()?.message)
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }

    fun setEditing(editing: Boolean) {
        _state.value = _state.value.copy(isEditing = editing)
    }
}
