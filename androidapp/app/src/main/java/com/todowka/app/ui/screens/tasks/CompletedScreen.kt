package com.todowka.app.ui.screens.tasks

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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

data class CompletedState(
    val tasks: List<TaskEntity> = emptyList(),
    val isLoading: Boolean = true
)

class CompletedViewModel(
    private val taskRepository: TaskRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(CompletedState())
    val state: StateFlow<CompletedState> = _state.asStateFlow()

    init {
        val userId = authPreferences.currentUserId
        if (userId != null) {
            viewModelScope.launch {
                taskRepository.getByStatus(userId, "completed").collect { tasks ->
                    _state.value = _state.value.copy(tasks = tasks, isLoading = false)
                }
            }
        }
    }

    fun clearCompleted() {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch { taskRepository.clearCompleted(userId) }
    }
}

@Composable
fun CompletedScreen(
    onTaskClick: (String) -> Unit = {},
    viewModel: CompletedViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()

    if (state.isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(vertical = 8.dp)
        ) {
            items(state.tasks, key = { it.id }) { task ->
                TaskItem(
                    task = task,
                    onToggle = {},
                    onClick = { onTaskClick(task.id) }
                )
            }
        }
    }
}
