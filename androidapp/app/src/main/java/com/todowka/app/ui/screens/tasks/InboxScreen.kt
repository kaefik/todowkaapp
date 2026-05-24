package com.todowka.app.ui.screens.tasks

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.TaskRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

data class InboxState(
    val tasks: List<TaskEntity> = emptyList(),
    val quickInput: String = "",
    val isLoading: Boolean = true,
    val error: String? = null
)

class InboxViewModel(
    private val taskRepository: TaskRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(InboxState())
    val state: StateFlow<InboxState> = _state.asStateFlow()

    init {
        loadTasks()
    }

    private fun loadTasks() {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            taskRepository.getByStatus(userId, "inbox").collect { tasks ->
                _state.value = _state.value.copy(tasks = tasks, isLoading = false)
            }
        }
    }

    fun onQuickInputChanged(value: String) {
        _state.value = _state.value.copy(quickInput = value)
    }

    fun createQuickTask() {
        val userId = authPreferences.currentUserId ?: return
        val title = _state.value.quickInput.trim()
        if (title.isBlank()) return
        viewModelScope.launch {
            taskRepository.createTask(userId, title, "inbox")
            _state.value = _state.value.copy(quickInput = "")
        }
    }

    fun toggleTask(taskId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch { taskRepository.toggleTask(taskId, userId) }
    }

    fun moveTask(taskId: String, newStatus: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch { taskRepository.moveTask(taskId, userId, newStatus) }
    }

    fun deleteTask(taskId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch { taskRepository.deleteTask(taskId, userId) }
    }
}

@Composable
fun InboxScreen(
    onTaskClick: (String) -> Unit = {},
    onAddTask: () -> Unit = {},
    viewModel: InboxViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            OutlinedTextField(
                value = state.quickInput,
                onValueChange = viewModel::onQuickInputChanged,
                placeholder = { Text("Быстрое добавление...") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
            )

            if (state.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(vertical = 4.dp)) {
                    items(state.tasks, key = { it.id }) { task ->
                        TaskItem(
                            task = task,
                            onToggle = { viewModel.toggleTask(task.id) },
                            onClick = { onTaskClick(task.id) }
                        )
                    }
                }
            }
        }

        FloatingActionButton(
            onClick = onAddTask,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = "Добавить")
        }
    }
}
