package com.todowka.app.ui.screens.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.preferences.UserPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class OnboardingState(
    val currentStep: Int = 0,
    val language: String = "ru",
    val timezone: String = "Europe/Moscow",
    val defaultSection: String = "inbox",
    val isLoading: Boolean = false,
    val isComplete: Boolean = false
)

class OnboardingViewModel(
    private val userPreferences: UserPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(OnboardingState())
    val state: StateFlow<OnboardingState> = _state.asStateFlow()

    fun setLanguage(language: String) {
        _state.value = _state.value.copy(language = language)
    }

    fun setTimezone(timezone: String) {
        _state.value = _state.value.copy(timezone = timezone)
    }

    fun setDefaultSection(section: String) {
        _state.value = _state.value.copy(defaultSection = section)
    }

    fun nextStep() {
        val next = (_state.value.currentStep + 1).coerceAtMost(2)
        _state.value = _state.value.copy(currentStep = next)
    }

    fun prevStep() {
        val prev = (_state.value.currentStep - 1).coerceAtLeast(0)
        _state.value = _state.value.copy(currentStep = prev)
    }

    fun completeOnboarding() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            userPreferences.setLanguage(_state.value.language)
            userPreferences.setDefaultSection(_state.value.defaultSection)
            userPreferences.setOnboarded(true)
            _state.value = _state.value.copy(isLoading = false, isComplete = true)
        }
    }
}
