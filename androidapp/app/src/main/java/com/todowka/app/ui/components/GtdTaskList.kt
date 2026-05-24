package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.FabPosition
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.domain.repository.AreaRepository
import com.todowka.app.domain.repository.ContextRepository
import com.todowka.app.domain.repository.ProjectRepository
import com.todowka.app.domain.repository.TagRepository
import com.todowka.app.domain.repository.TaskRepository
import com.todowka.app.util.DateTimeUtils
import com.todowka.app.util.GtdStatus
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

@Composable
fun GtdTaskList(
    title: String,
    gtdStatus: String,
    userId: String,
    emptyMessage: String,
    showFilter: Boolean = true,
    showVerbChips: Boolean = true,
    onTaskClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val taskRepo: TaskRepository = koinInject()
    val contextRepo: ContextRepository = koinInject()
    val projectRepo: ProjectRepository = koinInject()
    val areaRepo: AreaRepository = koinInject()
    val tagRepo: TagRepository = koinInject()

    val tasks by taskRepo.getByStatus(userId, gtdStatus).collectAsState(initial = emptyList())
    val contexts by contextRepo.getAll(userId).collectAsState(initial = emptyList())
    val projects by projectRepo.getActive(userId).collectAsState(initial = emptyList())
    val areas by areaRepo.getAll(userId).collectAsState(initial = emptyList())
    val allTags by tagRepo.getAll(userId).collectAsState(initial = emptyList())

    var showEditModal by remember { mutableStateOf(false) }
    var editingTask by remember { mutableStateOf<TaskEntity?>(null) }
    var quickAddText by remember { mutableStateOf("") }
    var showFilterPanel by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    var selectedContextId by remember { mutableStateOf<String?>(null) }
    var selectedProjectId by remember { mutableStateOf<String?>(null) }
    var selectedAreaId by remember { mutableStateOf<String?>(null) }
    var selectedTagIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var sortBy by remember { mutableStateOf(SortOption.POSITION) }
    var groupBy by remember { mutableStateOf(GroupOption.NONE) }

    Box(modifier = modifier.fillMaxSize()) {
        TaskListView(
            tasks = tasks,
            tags = emptyMap(),
            checklistCounts = emptyMap(),
            onTaskClick = onTaskClick,
            onTaskToggle = { taskId ->
                scope.launch { taskRepo.toggleTask(taskId, userId) }
            },
            onQuickAction = { taskId, action ->
                when (action) {
                    "edit" -> {
                        editingTask = tasks.find { it.id == taskId }
                        showEditModal = true
                    }
                }
            },
            emptyMessage = emptyMessage,
            quickAddText = quickAddText,
            onQuickAddTextChange = { quickAddText = it },
            onQuickAddSubmit = { text ->
                scope.launch {
                    taskRepo.createTask(
                        userId = userId,
                        title = text,
                        gtdStatus = gtdStatus
                    )
                }
                quickAddText = ""
            },
            verbChipsContent = if (showVerbChips) {
                {
                    VerbChips(
                        userId = userId,
                        onVerbSelected = { verb -> quickAddText = "$verb " }
                    )
                }
            } else null
        )

        if (showFilter) {
            androidx.compose.animation.AnimatedVisibility(
                visible = showFilterPanel,
                modifier = Modifier.align(Alignment.TopCenter)
            ) {
                TaskFilterPanel(
                    contexts = contexts,
                    projects = projects,
                    areas = areas,
                    tags = allTags,
                    selectedContextId = selectedContextId,
                    selectedProjectId = selectedProjectId,
                    selectedAreaId = selectedAreaId,
                    selectedTagIds = selectedTagIds,
                    sortBy = sortBy,
                    groupBy = groupBy,
                    onContextSelected = { selectedContextId = it },
                    onProjectSelected = { selectedProjectId = it },
                    onAreaSelected = { selectedAreaId = it },
                    onTagSelected = { selectedTagIds = selectedTagIds + it },
                    onTagDeselected = { selectedTagIds = selectedTagIds - it },
                    onSortChanged = { sortBy = it },
                    onGroupChanged = { groupBy = it }
                )
            }
        }

        FloatingActionButton(
            onClick = {
                editingTask = null
                showEditModal = true
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
        ) {
            Icon(Icons.Filled.Add, contentDescription = "Добавить задачу")
        }
    }

    if (showEditModal) {
        TaskEditModal(
            task = editingTask,
            contexts = contexts,
            projects = projects,
            areas = areas,
            tags = allTags,
            onSave = { entity ->
                scope.launch {
                    if (editingTask != null) {
                        taskRepo.updateTask(entity)
                    } else {
                        taskRepo.createTask(
                            userId = userId,
                            title = entity.title,
                            gtdStatus = gtdStatus,
                            description = entity.description,
                            contextId = entity.contextId,
                            areaId = entity.areaId,
                            projectId = entity.projectId,
                            dueDate = entity.dueDate
                        )
                    }
                }
                showEditModal = false
            },
            onDismiss = { showEditModal = false }
        )
    }
}
