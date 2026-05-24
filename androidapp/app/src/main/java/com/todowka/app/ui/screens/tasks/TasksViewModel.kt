package com.todowka.app.ui.screens.tasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.TaskRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

data class TasksState(
    val tasks: List<TaskEntity> = emptyList(),
    val filteredTasks: List<TaskEntity> = emptyList(),
    val searchQuery: String = "",
    val sortBy: String = "position",
    val filterStatus: String? = null,
    val isLoading: Boolean = true,
    val error: String? = null
)

class TasksViewModel(
    private val taskRepository: TaskRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(TasksState())
    val state: StateFlow<TasksState> = _state.asStateFlow()

    init {
        loadTasks()
    }

    private fun loadTasks() {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            combine(
                taskRepository.getByStatus(userId, "inbox"),
                taskRepository.getByStatus(userId, "active"),
                taskRepository.getByStatus(userId, "next"),
                taskRepository.getByStatus(userId, "waiting"),
                taskRepository.getByStatus(userId, "someday")
            ) { lists ->
                lists.toList().flatten()
            }.collect { tasks ->
                _state.value = _state.value.copy(
                    tasks = tasks,
                    filteredTasks = applyFilterAndSort(tasks),
                    isLoading = false
                )
            }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _state.value = _state.value.copy(
            searchQuery = query,
            filteredTasks = applyFilterAndSort(_state.value.tasks, query)
        )
    }

    fun onSortChanged(sortBy: String) {
        _state.value = _state.value.copy(
            sortBy = sortBy,
            filteredTasks = applyFilterAndSort(_state.value.tasks, sortBy = sortBy)
        )
    }

    fun onFilterChanged(status: String?) {
        _state.value = _state.value.copy(
            filterStatus = status,
            filteredTasks = applyFilterAndSort(_state.value.tasks, filterStatus = status)
        )
    }

    fun toggleTask(taskId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            taskRepository.toggleTask(taskId, userId)
        }
    }

    fun deleteTask(taskId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            taskRepository.deleteTask(taskId, userId)
        }
    }

    fun moveTask(taskId: String, newStatus: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            taskRepository.moveTask(taskId, userId, newStatus)
        }
    }

    private fun applyFilterAndSort(
        tasks: List<TaskEntity>,
        searchQuery: String = _state.value.searchQuery,
        sortBy: String = _state.value.sortBy,
        filterStatus: String? = _state.value.filterStatus
    ): List<TaskEntity> {
        var result = tasks
        if (filterStatus != null) {
            result = result.filter { it.gtdStatus == filterStatus }
        }
        if (searchQuery.isNotBlank()) {
            result = result.filter {
                it.title.contains(searchQuery, ignoreCase = true)
            }
        }
        result = when (sortBy) {
            "position" -> result.sortedBy { it.position }
            "title" -> result.sortedBy { it.title.lowercase() }
            "dueDate" -> result.sortedBy { it.dueDate }
            else -> result
        }
        return result
    }
}
