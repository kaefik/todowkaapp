package com.todowka.app.ui.screens.areas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.AreaEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.AreaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AreasState(
    val areas: List<AreaEntity> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

class AreasViewModel(
    private val areaRepository: AreaRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(AreasState())
    val state: StateFlow<AreasState> = _state.asStateFlow()

    init {
        loadAreas()
    }

    fun loadAreas() {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            areaRepository.getAll(userId).collect { areas ->
                _state.value = _state.value.copy(areas = areas, isLoading = false)
            }
        }
    }

    fun createArea(name: String, description: String? = null, color: String? = null) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            try {
                areaRepository.createArea(userId, name, description, color)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }

    fun updateArea(area: AreaEntity) {
        viewModelScope.launch {
            try {
                areaRepository.updateArea(area)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }

    fun deleteArea(areaId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            try {
                areaRepository.deleteArea(areaId, userId)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }
}
