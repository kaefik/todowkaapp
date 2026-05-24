package com.todowka.app.ui.screens.projects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.ProjectEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.ProjectRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ProjectsState(
    val projects: List<ProjectEntity> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = true,
    val error: String? = null
)

class ProjectsViewModel(
    private val projectRepository: ProjectRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(ProjectsState())
    val state: StateFlow<ProjectsState> = _state.asStateFlow()

    init {
        loadProjects()
    }

    fun loadProjects() {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            projectRepository.getAll(userId).collect { projects ->
                _state.value = _state.value.copy(projects = projects, isLoading = false)
            }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _state.value = _state.value.copy(searchQuery = query)
    }

    fun createProject(name: String, description: String? = null, color: String? = null, areaId: String? = null) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            try {
                projectRepository.createProject(userId, name, description, color, areaId)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }

    fun updateProject(project: ProjectEntity) {
        viewModelScope.launch {
            try {
                projectRepository.updateProject(project)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }

    fun deleteProject(projectId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            try {
                projectRepository.deleteProject(projectId, userId)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }
}
