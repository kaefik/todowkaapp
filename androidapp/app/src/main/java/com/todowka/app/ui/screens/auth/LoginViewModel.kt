package com.todowka.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LoginState(
    val username: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null
)

class LoginViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()

    fun onUsernameChanged(value: String) {
        _state.value = _state.value.copy(username = value, error = null)
    }

    fun onPasswordChanged(value: String) {
        _state.value = _state.value.copy(password = value, error = null)
    }

    fun login(onSuccess: () -> Unit) {
        val state = _state.value
        if (state.username.isBlank() || state.password.isBlank()) {
            _state.value = state.copy(error = "Заполните все поля")
            return
        }

        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = authRepository.login(state.username, state.password)
            _state.value = _state.value.copy(isLoading = false)
            if (result.isSuccess) {
                onSuccess()
            } else {
                _state.value = _state.value.copy(
                    error = result.exceptionOrNull()?.message ?: "Ошибка входа"
                )
            }
        }
    }
}
