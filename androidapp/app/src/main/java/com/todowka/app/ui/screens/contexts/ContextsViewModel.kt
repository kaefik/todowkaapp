package com.todowka.app.ui.screens.contexts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.ContextEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.ContextRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ContextsState(
    val contexts: List<ContextEntity> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

class ContextsViewModel(
    private val contextRepository: ContextRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(ContextsState())
    val state: StateFlow<ContextsState> = _state.asStateFlow()

    init {
        loadContexts()
    }

    fun loadContexts() {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            contextRepository.getAll(userId).collect { contexts ->
                _state.value = _state.value.copy(contexts = contexts, isLoading = false)
            }
        }
    }

    fun createContext(name: String, color: String? = null, icon: String? = null) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            try {
                contextRepository.createContext(userId, name, color, icon)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }

    fun updateContext(context: ContextEntity) {
        viewModelScope.launch {
            try {
                contextRepository.updateContext(context)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }

    fun deleteContext(contextId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            try {
                contextRepository.deleteContext(contextId, userId)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }
}
