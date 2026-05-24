package com.todowka.app.ui.screens.projects

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.ProjectEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.ProjectRepository
import com.todowka.app.domain.repository.TaskRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

data class ProjectDetailState(
    val project: ProjectEntity? = null,
    val tasks: List<TaskEntity> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

class ProjectDetailViewModel(
    savedStateHandle: SavedStateHandle,
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val projectId: String = savedStateHandle["projectId"] ?: ""

    private val _state = MutableStateFlow(ProjectDetailState())
    val state: StateFlow<ProjectDetailState> = _state.asStateFlow()

    init {
        loadProject()
    }

    private fun loadProject() {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            try {
                combine(
                    projectRepository.getById(projectId, userId),
                    taskRepository.getByProject(userId, projectId)
                ) { project, tasks ->
                    _state.value.copy(project = project, tasks = tasks, isLoading = false, error = null)
                }.collect { newState ->
                    _state.value = newState
                }
            } catch (e: Exception) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun loadTasks() {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            taskRepository.getByProject(userId, projectId).collect { tasks ->
                _state.value = _state.value.copy(tasks = tasks)
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
}
