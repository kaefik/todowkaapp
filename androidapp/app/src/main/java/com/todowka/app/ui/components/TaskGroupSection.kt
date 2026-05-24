package com.todowka.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
fun TaskGroupSection(
    title: String,
    tasks: List<TaskEntity>,
    tags: Map<String, List<TagEntity>>,
    checklistCounts: Map<String, Int>,
    onTaskClick: (String) -> Unit,
    onTaskToggle: (String) -> Unit,
    onQuickAction: (String, String) -> Unit,
    defaultExpanded: Boolean = true,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(defaultExpanded) }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded }
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "$title (${tasks.size})",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = { expanded = !expanded }) {
                Icon(
                    imageVector = if (expanded) {
                        Icons.Filled.ExpandLess
                    } else {
                        Icons.Filled.ExpandMore
                    },
                    contentDescription = if (expanded) "Свернуть" else "Развернуть",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        AnimatedVisibility(
            visible = expanded,
            enter = expandVertically(),
            exit = shrinkVertically()
        ) {
            Column {
                tasks.forEach { task ->
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
