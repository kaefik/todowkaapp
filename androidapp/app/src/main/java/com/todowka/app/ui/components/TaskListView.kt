package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.TagEntity
import com.todowka.app.data.local.db.entity.TaskEntity

@Composable
fun TaskListView(
    tasks: List<TaskEntity>,
    tags: Map<String, List<TagEntity>>,
    checklistCounts: Map<String, Int>,
    onTaskClick: (String) -> Unit,
    onTaskToggle: (String) -> Unit,
    onQuickAction: (String, String) -> Unit,
    showCompleted: Boolean = false,
    emptyMessage: String = "Нет задач",
    showQuickAdd: Boolean = true,
    quickAddText: String = "",
    onQuickAddTextChange: (String) -> Unit = {},
    onQuickAddSubmit: (String) -> Unit = {},
    verbChipsContent: @Composable (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        if (showQuickAdd) {
            OutlinedTextField(
                value = quickAddText,
                onValueChange = onQuickAddTextChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Добавить задачу...") },
                singleLine = true,
                trailingIcon = {
                    if (quickAddText.isNotBlank()) {
                        IconButton(onClick = {
                            onQuickAddSubmit(quickAddText)
                        }) {
                            Icon(
                                imageVector = Icons.Filled.Add,
                                contentDescription = "Добавить"
                            )
                        }
                    }
                }
            )
        }

        verbChipsContent?.invoke()

        if (tasks.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Filled.Inbox,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.height(48.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = emptyMessage,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(0.dp)
            ) {
                items(tasks, key = { it.id }) { task ->
                    TaskCard(
                        task = task,
                        tags = tags[task.id] ?: emptyList(),
                        checklistCount = checklistCounts[task.id] ?: 0,
                        onClick = { onTaskClick(task.id) },
                        onToggle = { onTaskToggle(task.id) },
                        onLongClick = { onQuickAction(task.id, "edit") }
                    )
                }
            }
        }
    }
}


