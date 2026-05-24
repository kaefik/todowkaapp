package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.AreaEntity
import com.todowka.app.data.local.db.entity.ContextEntity
import com.todowka.app.data.local.db.entity.ProjectEntity
import com.todowka.app.data.local.db.entity.TagEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.util.DateTimeUtils
import com.todowka.app.util.GtdStatus
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskEditModal(
    task: TaskEntity?,
    contexts: List<ContextEntity>,
    projects: List<ProjectEntity>,
    areas: List<AreaEntity>,
    tags: List<TagEntity>,
    onSave: (TaskEntity) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var title by remember { mutableStateOf(task?.title ?: "") }
    var description by remember { mutableStateOf(task?.description ?: "") }
    var selectedStatus by remember { mutableStateOf(task?.gtdStatus ?: GtdStatus.INBOX.value) }
    var selectedContextId by remember { mutableStateOf(task?.contextId) }
    var selectedProjectId by remember { mutableStateOf(task?.projectId) }
    var selectedAreaId by remember { mutableStateOf(task?.areaId) }
    var selectedTagIds by remember { mutableStateOf(task?.let { emptySet<String>() } ?: emptySet()) }
    var dueDate by remember { mutableStateOf(task?.dueDate) }
    var showDatePicker by remember { mutableStateOf(false) }

    var statusExpanded by remember { mutableStateOf(false) }
    var contextExpanded by remember { mutableStateOf(false) }
    var projectExpanded by remember { mutableStateOf(false) }
    var areaExpanded by remember { mutableStateOf(false) }

    val isEdit = task != null

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = if (isEdit) "Редактировать задачу" else "Новая задача",
                style = MaterialTheme.typography.titleLarge
            )

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Название") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Описание") },
                minLines = 2,
                maxLines = 4,
                modifier = Modifier.fillMaxWidth()
            )

            ExposedDropdownMenuBox(
                expanded = statusExpanded,
                onExpandedChange = { statusExpanded = it }
            ) {
                OutlinedTextField(
                    value = statusLabel(selectedStatus),
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Статус GTD") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = statusExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                )
                ExposedDropdownMenu(
                    expanded = statusExpanded,
                    onDismissRequest = { statusExpanded = false }
                ) {
                    GtdStatus.entries.forEach { status ->
                        DropdownMenuItem(
                            text = { Text(statusLabel(status.value)) },
                            onClick = {
                                selectedStatus = status.value
                                statusExpanded = false
                            }
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ExposedDropdownMenuBox(
                    expanded = contextExpanded,
                    onExpandedChange = { contextExpanded = it },
                    modifier = Modifier.weight(1f)
                ) {
                    OutlinedTextField(
                        value = contexts.find { it.id == selectedContextId }?.name ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Контекст") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = contextExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                    )
                    ExposedDropdownMenu(
                        expanded = contextExpanded,
                        onDismissRequest = { contextExpanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Нет") },
                            onClick = { selectedContextId = null; contextExpanded = false }
                        )
                        contexts.forEach { ctx ->
                            DropdownMenuItem(
                                text = { Text(ctx.name) },
                                onClick = { selectedContextId = ctx.id; contextExpanded = false }
                            )
                        }
                    }
                }

                ExposedDropdownMenuBox(
                    expanded = projectExpanded,
                    onExpandedChange = { projectExpanded = it },
                    modifier = Modifier.weight(1f)
                ) {
                    OutlinedTextField(
                        value = projects.find { it.id == selectedProjectId }?.name ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Проект") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = projectExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                    )
                    ExposedDropdownMenu(
                        expanded = projectExpanded,
                        onDismissRequest = { projectExpanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Нет") },
                            onClick = { selectedProjectId = null; projectExpanded = false }
                        )
                        projects.forEach { proj ->
                            DropdownMenuItem(
                                text = { Text(proj.name) },
                                onClick = { selectedProjectId = proj.id; projectExpanded = false }
                            )
                        }
                    }
                }
            }

            ExposedDropdownMenuBox(
                expanded = areaExpanded,
                onExpandedChange = { areaExpanded = it }
            ) {
                OutlinedTextField(
                    value = areas.find { it.id == selectedAreaId }?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Область") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = areaExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                )
                ExposedDropdownMenu(
                    expanded = areaExpanded,
                    onDismissRequest = { areaExpanded = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Нет") },
                        onClick = { selectedAreaId = null; areaExpanded = false }
                    )
                    areas.forEach { area ->
                        DropdownMenuItem(
                            text = { Text(area.name) },
                            onClick = { selectedAreaId = area.id; areaExpanded = false }
                        )
                    }
                }
            }

            if (tags.isNotEmpty()) {
                Text(text = "Теги", style = MaterialTheme.typography.labelLarge)
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(tags, key = { it.id }) { tag ->
                        FilterChip(
                            selected = tag.id in selectedTagIds,
                            onClick = {
                                selectedTagIds = if (tag.id in selectedTagIds) {
                                    selectedTagIds - tag.id
                                } else {
                                    selectedTagIds + tag.id
                                }
                            },
                            label = { Text(tag.name, style = MaterialTheme.typography.labelSmall) }
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = dueDate?.let { DateTimeUtils.formatDate(it) } ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Срок") },
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(onClick = { showDatePicker = true }) {
                    Text("Выбрать")
                }
                if (dueDate != null) {
                    TextButton(onClick = { dueDate = null }) {
                        Text("Сбросить")
                    }
                }
            }

            Button(
                onClick = {
                    val now = DateTimeUtils.nowIso()
                    val entity = TaskEntity(
                        id = task?.id ?: UUID.randomUUID().toString(),
                        userId = task?.userId ?: "",
                        title = title,
                        description = description.ifBlank { null },
                        gtdStatus = selectedStatus,
                        contextId = selectedContextId,
                        areaId = selectedAreaId,
                        projectId = selectedProjectId,
                        dueDate = dueDate,
                        isCompleted = task?.isCompleted ?: false,
                        completedAt = task?.completedAt,
                        position = task?.position ?: 0,
                        createdAt = task?.createdAt ?: now,
                        updatedAt = now
                    )
                    onSave(entity)
                },
                enabled = title.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (isEdit) "Сохранить" else "Создать")
            }
        }
    }

    if (showDatePicker) {
        val datePickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val instant = Instant.fromEpochMilliseconds(millis)
                            val localDate = instant.toLocalDateTime(TimeZone.currentSystemDefault()).date
                            dueDate = localDate.toString()
                        }
                        showDatePicker = false
                    }
                ) { Text("ОК") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text("Отмена") }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

private fun statusLabel(status: String): String = when (status) {
    GtdStatus.INBOX.value -> "Входящие"
    GtdStatus.ACTIVE.value -> "Активные"
    GtdStatus.NEXT.value -> "Следующие"
    GtdStatus.WAITING.value -> "Ожидание"
    GtdStatus.SOMEDAY.value -> "Когда-нибудь"
    GtdStatus.COMPLETED.value -> "Завершено"
    GtdStatus.TRASH.value -> "Корзина"
    else -> status
}
