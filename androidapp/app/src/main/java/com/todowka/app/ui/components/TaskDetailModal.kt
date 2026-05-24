package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Circle
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Label
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.ContextEntity
import com.todowka.app.data.local.db.entity.ProjectEntity
import com.todowka.app.data.local.db.entity.AreaEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.data.local.db.entity.TagEntity
import com.todowka.app.domain.repository.ChecklistRepository
import com.todowka.app.util.DateTimeUtils
import org.koin.compose.koinInject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskDetailModal(
    task: TaskEntity,
    context: ContextEntity?,
    project: ProjectEntity?,
    area: AreaEntity?,
    tags: List<TagEntity>,
    onEdit: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val checklistRepo: ChecklistRepository = koinInject()
    val checklistItems by checklistRepo.getByTaskId(task.id, task.userId).collectAsState(initial = emptyList())

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = task.title,
                style = MaterialTheme.typography.headlineSmall,
                textDecoration = if (task.isCompleted) TextDecoration.LineThrough else TextDecoration.None
            )

            task.description?.takeIf { it.isNotBlank() }?.let { desc ->
                Text(
                    text = desc,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            DetailRow(
                icon = Icons.Filled.PlayArrow,
                label = "Статус",
                value = statusLabel(task.gtdStatus)
            )

            context?.let { ctx ->
                DetailRow(
                    icon = Icons.Filled.Label,
                    label = "Контекст",
                    value = ctx.name
                )
            }

            project?.let { proj ->
                DetailRow(
                    icon = Icons.Filled.Folder,
                    label = "Проект",
                    value = proj.name
                )
            }

            area?.let { a ->
                DetailRow(
                    icon = Icons.Filled.Dashboard,
                    label = "Область",
                    value = a.name
                )
            }

            task.dueDate?.let { date ->
                val isOverdue = DateTimeUtils.isOverdue(date) && !task.isCompleted
                DetailRow(
                    icon = Icons.Filled.CalendarToday,
                    label = "Срок",
                    value = DateTimeUtils.formatDate(date),
                    valueColor = if (isOverdue) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                )
            }

            if (task.isCompleted) {
                task.completedAt?.let {
                    DetailRow(
                        icon = Icons.Filled.CheckCircle,
                        label = "Завершено",
                        value = DateTimeUtils.formatDate(it)
                    )
                }
            }

            DetailRow(
                icon = Icons.Filled.Schedule,
                label = "Создано",
                value = DateTimeUtils.formatDate(task.createdAt)
            )

            if (tags.isNotEmpty()) {
                Column {
                    Text(
                        text = "Теги",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        tags.forEach { tag ->
                            androidx.compose.material3.AssistChip(
                                onClick = {},
                                label = { Text(tag.name, style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }
                }
            }

            if (checklistItems.isNotEmpty()) {
                Column {
                    Text(
                        text = "Чеклист (${checklistItems.count { it.isCompleted }}/${checklistItems.size})",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    checklistItems.forEach { item ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (item.isCompleted) {
                                    Icons.Filled.CheckCircle
                                } else {
                                    Icons.Filled.Circle
                                },
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = if (item.isCompleted) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = item.title,
                                style = MaterialTheme.typography.bodyMedium,
                                textDecoration = if (item.isCompleted) TextDecoration.LineThrough else TextDecoration.None
                            )
                        }
                    }
                }
            }

            Button(
                onClick = onEdit,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Редактировать")
            }
        }
    }
}

@Composable
private fun DetailRow(
    icon: ImageVector,
    label: String,
    value: String,
    valueColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(100.dp)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = valueColor
        )
    }
}

private fun statusLabel(status: String): String = when (status) {
    "inbox" -> "Входящие"
    "active" -> "Активные"
    "next" -> "Следующие"
    "waiting" -> "Ожидание"
    "someday" -> "Когда-нибудь"
    "completed" -> "Завершено"
    "trash" -> "Корзина"
    else -> status
}
