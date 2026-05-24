package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.TagEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.ui.theme.Green500

@Composable
fun CompletedTodayBlock(
    tasks: List<TaskEntity>,
    tags: Map<String, List<TagEntity>>,
    checklistCounts: Map<String, Int>,
    onTaskClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (tasks.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = Green500,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Завершено сегодня (${tasks.size})",
                style = MaterialTheme.typography.titleSmall,
                color = Green500
            )
        }

        tasks.forEach { task ->
            TaskCard(
                task = task,
                tags = tags[task.id] ?: emptyList(),
                checklistCount = checklistCounts[task.id] ?: 0,
                onClick = { onTaskClick(task.id) },
                onToggle = {},
                onLongClick = {}
            )
        }
    }
}
