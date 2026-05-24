package com.todowka.app.ui.screens.areas

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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.AreaEntity
import com.todowka.app.data.local.db.entity.ProjectEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.AreaRepository
import com.todowka.app.domain.repository.ProjectRepository
import com.todowka.app.domain.repository.TaskRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

data class AreaDetailState(
    val area: AreaEntity? = null,
    val projects: List<ProjectEntity> = emptyList(),
    val tasks: List<TaskEntity> = emptyList(),
    val isLoading: Boolean = true
)

class AreaDetailViewModel(
    private val areaRepository: AreaRepository,
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(AreaDetailState())
    val state: StateFlow<AreaDetailState> = _state.asStateFlow()

    fun loadArea(areaId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            areaRepository.getById(areaId, userId).collect { area ->
                _state.value = _state.value.copy(area = area)
            }
        }
        viewModelScope.launch {
            taskRepository.getByArea(userId, areaId).collect { tasks ->
                _state.value = _state.value.copy(tasks = tasks, isLoading = false)
            }
        }
    }

    fun toggleTask(taskId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch { taskRepository.toggleTask(taskId, userId) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AreaDetailScreen(
    areaId: String,
    onBack: () -> Unit = {},
    onEditArea: (String) -> Unit = {},
    onTaskClick: (String) -> Unit = {},
    viewModel: AreaDetailViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()

    androidx.compose.runtime.LaunchedEffect(areaId) {
        viewModel.loadArea(areaId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.area?.name ?: "Область") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Назад")
                    }
                },
                actions = {
                    IconButton(onClick = { onEditArea(areaId) }) {
                        Icon(Icons.Default.Edit, contentDescription = "Редактировать")
                    }
                }
            )
        }
    ) { padding ->
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(vertical = 8.dp, horizontal = 16.dp)
            ) {
                val area = state.area
                if (area != null) {
                    item {
                        Card(
                            modifier = Modifier.padding(vertical = 4.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(text = area.name, style = MaterialTheme.typography.titleLarge)
                                if (area.description != null) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(text = area.description, style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                        }
                    }
                }
                if (state.tasks.isNotEmpty()) {
                    item {
                        Text(
                            text = "Задачи",
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                        )
                    }
                    items(state.tasks, key = { it.id }) { task ->
                        ListItem(
                            headlineContent = {
                                Text(text = task.title, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            },
                            leadingContent = {
                                Checkbox(
                                    checked = task.isCompleted,
                                    onCheckedChange = { viewModel.toggleTask(task.id) }
                                )
                            }
                        )
                    }
                }
            }
        }
    }
}
