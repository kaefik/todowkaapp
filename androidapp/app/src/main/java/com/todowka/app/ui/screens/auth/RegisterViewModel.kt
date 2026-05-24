package com.todowka.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class RegisterState(
    val username: String = "",
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null
)

class RegisterViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(RegisterState())
    val state: StateFlow<RegisterState> = _state.asStateFlow()

    fun onUsernameChanged(value: String) {
        _state.value = _state.value.copy(username = value, error = null)
    }

    fun onEmailChanged(value: String) {
        _state.value = _state.value.copy(email = value, error = null)
    }

    fun onPasswordChanged(value: String) {
        _state.value = _state.value.copy(password = value, error = null)
    }

    fun register(onSuccess: () -> Unit) {
        val state = _state.value
        if (state.username.isBlank() || state.email.isBlank() || state.password.isBlank()) {
            _state.value = state.copy(error = "Заполните все поля")
            return
        }

        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = authRepository.register(state.username, state.email, state.password)
            _state.value = _state.value.copy(isLoading = false)
            if (result.isSuccess) {
                onSuccess()
            } else {
                _state.value = _state.value.copy(
                    error = result.exceptionOrNull()?.message ?: "Ошибка регистрации"
                )
            }
        }
    }
}
