package com.todowka.app.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.VerbTemplateEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.data.local.preferences.UserPreferences
import com.todowka.app.data.remote.dto.response.SessionResponse
import com.todowka.app.data.remote.dto.response.UserResponse
import com.todowka.app.data.remote.api.SessionsApi
import com.todowka.app.data.remote.api.UsersApi
import com.todowka.app.data.remote.dto.request.UserUpdateRequest
import com.todowka.app.domain.repository.AuthRepository
import com.todowka.app.domain.repository.VerbTemplateRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SettingsState(
    val user: UserResponse? = null,
    val darkMode: Boolean = false,
    val language: String = "ru",
    val defaultSection: String = "inbox",
    val verbTemplates: List<VerbTemplateEntity> = emptyList(),
    val sessions: List<SessionResponse> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

class SettingsViewModel(
    private val authRepository: AuthRepository,
    private val userPreferences: UserPreferences,
    private val authPreferences: AuthPreferences,
    private val verbTemplateRepository: VerbTemplateRepository,
    private val sessionsApi: SessionsApi,
    private val usersApi: UsersApi
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsState())
    val state: StateFlow<SettingsState> = _state.asStateFlow()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val userResult = authRepository.getCurrentUser()
            if (userResult.isSuccess) {
                _state.value = _state.value.copy(user = userResult.getOrNull())
            }
            userPreferences.isDarkMode.collect { dark ->
                _state.value = _state.value.copy(darkMode = dark)
            }
        }
        viewModelScope.launch {
            userPreferences.language.collect { lang ->
                _state.value = _state.value.copy(language = lang)
            }
        }
        viewModelScope.launch {
            userPreferences.defaultSection.collect { section ->
                _state.value = _state.value.copy(defaultSection = section)
            }
        }
        viewModelScope.launch {
            val userId = authPreferences.currentUserId ?: return@launch
            verbTemplateRepository.getAll(userId).collect { templates ->
                _state.value = _state.value.copy(verbTemplates = templates)
            }
        }
        viewModelScope.launch {
            try {
                val response = sessionsApi.getSessions()
                if (response.isSuccessful) {
                    _state.value = _state.value.copy(sessions = response.body()?.items ?: emptyList())
                }
            } catch (_: Exception) {}
            _state.value = _state.value.copy(isLoading = false)
        }
    }

    fun updateDarkMode(enabled: Boolean) {
        viewModelScope.launch {
            userPreferences.setDarkMode(enabled)
            _state.value = _state.value.copy(darkMode = enabled)
        }
    }

    fun updateLanguage(language: String) {
        viewModelScope.launch {
            userPreferences.setLanguage(language)
            _state.value = _state.value.copy(language = language)
        }
    }

    fun updateDefaultSection(section: String) {
        viewModelScope.launch {
            userPreferences.setDefaultSection(section)
            _state.value = _state.value.copy(defaultSection = section)
        }
    }

    fun updateProfile(username: String?, email: String?, timezone: String?, language: String?) {
        viewModelScope.launch {
            try {
                val request = UserUpdateRequest(
                    username = username,
                    email = email,
                    timezone = timezone,
                    language = language
                )
                val response = usersApi.updateCurrentUser(request)
                if (response.isSuccessful) {
                    _state.value = _state.value.copy(user = response.body())
                }
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }
}
