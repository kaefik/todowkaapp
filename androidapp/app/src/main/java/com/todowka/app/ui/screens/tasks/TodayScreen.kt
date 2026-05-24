package com.todowka.app.ui.screens.tasks

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
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
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class TodayState(
    val overdueTasks: List<TaskEntity> = emptyList(),
    val todayTasks: List<TaskEntity> = emptyList(),
    val completedToday: List<TaskEntity> = emptyList(),
    val isLoading: Boolean = true
)

class TodayViewModel(
    private val taskRepository: TaskRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(TodayState())
    val state: StateFlow<TodayState> = _state.asStateFlow()

    init {
        loadTasks()
    }

    private fun loadTasks() {
        val userId = authPreferences.currentUserId ?: return
        val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        viewModelScope.launch {
            taskRepository.getOverdueTasks(userId, today).collect { overdue ->
                _state.value = _state.value.copy(overdueTasks = overdue)
            }
        }
        viewModelScope.launch {
            taskRepository.getDueTasks(userId, today).collect { todayTasks ->
                _state.value = _state.value.copy(todayTasks = todayTasks, isLoading = false)
            }
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
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayScreen(
    onTaskClick: (String) -> Unit = {},
    onAddTask: () -> Unit = {},
    viewModel: TodayViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Сегодня") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddTask) {
                Icon(Icons.Default.Add, contentDescription = "Добавить")
            }
        }
    ) { padding ->
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                if (state.overdueTasks.isNotEmpty()) {
                    item {
                        Text(
                            text = "Просроченные (${state.overdueTasks.size})",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }
                    items(state.overdueTasks, key = { "overdue-${it.id}" }) { task ->
                        TaskItem(
                            task = task,
                            onToggle = { viewModel.toggleTask(task.id) },
                            onClick = { onTaskClick(task.id) }
                        )
                    }
                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }
                item {
                    Text(
                        text = "Сегодня (${state.todayTasks.size})",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
                items(state.todayTasks, key = { "today-${it.id}" }) { task ->
                    TaskItem(
                        task = task,
                        onToggle = { viewModel.toggleTask(task.id) },
                        onClick = { onTaskClick(task.id) }
                    )
                }
            }
        }
    }
}
