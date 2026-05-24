package com.todowka.app.ui.components.calendar

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.CalendarEventEntity
import com.todowka.app.ui.components.ColorPickerField
import com.todowka.app.ui.components.RecurrenceEditor
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.LocalTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toInstant
import kotlinx.datetime.toLocalDateTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventEditorModal(
    event: CalendarEventEntity?,
    onSave: (CalendarEventEntity) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isNew = event == null
    val now = remember {
        Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault())
    }

    var title by remember { mutableStateOf(event?.title ?: "") }
    var description by remember { mutableStateOf(event?.description ?: "") }
    var startDate by remember { mutableStateOf(event?.let { tryParseDate(it.startTime) } ?: now.date) }
    var startTime by remember { mutableStateOf(event?.let { tryParseTime(it.startTime) } ?: LocalTime(now.hour, now.minute)) }
    var endDate by remember { mutableStateOf(event?.endTime?.let { tryParseDate(it) } ?: now.date) }
    var endTime by remember { mutableStateOf(event?.endTime?.let { tryParseTime(it) } ?: LocalTime(now.hour + 1, now.minute)) }
    var allDay by remember { mutableStateOf(event?.allDay ?: false) }
    var selectedColor by remember { mutableStateOf(event?.color) }
    var location by remember { mutableStateOf(event?.location ?: "") }

    var recurrenceType by remember { mutableStateOf(event?.recurrenceType) }
    var recurrenceConfig by remember { mutableStateOf(event?.recurrenceConfig) }
    var recurrenceEndDate by remember { mutableStateOf(event?.recurrenceEndDate) }

    var showStartDatePicker by remember { mutableStateOf(false) }
    var showStartTimePicker by remember { mutableStateOf(false) }
    var showEndDatePicker by remember { mutableStateOf(false) }
    var showEndTimePicker by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = if (isNew) "Новое событие" else "Редактирование",
                style = MaterialTheme.typography.titleMedium
            )

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Название") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Описание") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 4
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Весь день", modifier = Modifier.weight(1f))
                Switch(checked = allDay, onCheckedChange = { allDay = it })
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = startDate.toString(),
                    onValueChange = {},
                    label = { Text("Дата начала") },
                    modifier = Modifier
                        .weight(1f)
                        .clickable { showStartDatePicker = true },
                    readOnly = true,
                    enabled = false
                )
                if (!allDay) {
                    OutlinedTextField(
                        value = String.format(java.util.Locale.ROOT, "%02d:%02d", startTime.hour, startTime.minute),
                        onValueChange = {},
                        label = { Text("Время") },
                        modifier = Modifier
                            .width(100.dp)
                            .clickable { showStartTimePicker = true },
                        readOnly = true,
                        enabled = false
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = endDate.toString(),
                    onValueChange = {},
                    label = { Text("Дата окончания") },
                    modifier = Modifier
                        .weight(1f)
                        .clickable { showEndDatePicker = true },
                    readOnly = true,
                    enabled = false
                )
                if (!allDay) {
                    OutlinedTextField(
                        value = String.format(java.util.Locale.ROOT, "%02d:%02d", endTime.hour, endTime.minute),
                        onValueChange = {},
                        label = { Text("Время") },
                        modifier = Modifier
                            .width(100.dp)
                            .clickable { showEndTimePicker = true },
                        readOnly = true,
                        enabled = false
                    )
                }
            }

            Text("Цвет", style = MaterialTheme.typography.labelMedium)
            ColorPickerField(
                selectedColor = selectedColor,
                onColorSelected = { selectedColor = it }
            )

            OutlinedTextField(
                value = location,
                onValueChange = { location = it },
                label = { Text("Место") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(4.dp))
            Text("Повторение", style = MaterialTheme.typography.labelMedium)
            RecurrenceEditor(
                type = recurrenceType,
                config = recurrenceConfig,
                endDate = recurrenceEndDate,
                onChange = { type, config, end ->
                    recurrenceType = type
                    recurrenceConfig = config
                    recurrenceEndDate = end
                }
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(onClick = onDismiss) {
                    Text("Отмена")
                }
                Spacer(modifier = Modifier.width(8.dp))
                Button(
                    onClick = {
                        val startInstant = if (allDay) {
                            LocalDateTime(startDate, LocalTime(0, 0))
                                .toInstant(TimeZone.currentSystemDefault()).toString()
                        } else {
                            LocalDateTime(startDate, startTime)
                                .toInstant(TimeZone.currentSystemDefault()).toString()
                        }
                        val endInstant = if (allDay) {
                            LocalDateTime(endDate, LocalTime(23, 59))
                                .toInstant(TimeZone.currentSystemDefault()).toString()
                        } else {
                            LocalDateTime(endDate, endTime)
                                .toInstant(TimeZone.currentSystemDefault()).toString()
                        }
                        val nowInstant = Clock.System.now().toString()
                        val result = CalendarEventEntity(
                            id = event?.id ?: java.util.UUID.randomUUID().toString(),
                            userId = event?.userId ?: "",
                            title = title,
                            description = description.ifBlank { null },
                            startTime = startInstant,
                            endTime = endInstant,
                            allDay = allDay,
                            color = selectedColor,
                            location = location.ifBlank { null },
                            attendees = event?.attendees,
                            recurrenceType = recurrenceType,
                            recurrenceConfig = recurrenceConfig,
                            recurrenceEndDate = recurrenceEndDate,
                            createdAt = event?.createdAt ?: nowInstant,
                            updatedAt = nowInstant,
                            _syncStatus = event?._syncStatus ?: "pending",
                            _lastSyncedAt = event?._lastSyncedAt
                        )
                        onSave(result)
                    },
                    enabled = title.isNotBlank()
                ) {
                    Text(if (isNew) "Создать" else "Сохранить")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    if (showStartDatePicker) {
        val state = rememberDatePickerState(
            initialSelectedDateMillis = startDate.toEpochDays().toLong() * 86400000L
        )
        DatePickerDialog(
            onDismissRequest = { showStartDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { millis ->
                        startDate = Instant.fromEpochMilliseconds(millis)
                            .toLocalDateTime(TimeZone.currentSystemDefault()).date
                    }
                    showStartDatePicker = false
                }) { Text("ОК") }
            },
            dismissButton = {
                TextButton(onClick = { showStartDatePicker = false }) { Text("Отмена") }
            }
        ) {
            DatePicker(state = state)
        }
    }

    if (showEndDatePicker) {
        val state = rememberDatePickerState(
            initialSelectedDateMillis = endDate.toEpochDays().toLong() * 86400000L
        )
        DatePickerDialog(
            onDismissRequest = { showEndDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { millis ->
                        endDate = Instant.fromEpochMilliseconds(millis)
                            .toLocalDateTime(TimeZone.currentSystemDefault()).date
                    }
                    showEndDatePicker = false
                }) { Text("ОК") }
            },
            dismissButton = {
                TextButton(onClick = { showEndDatePicker = false }) { Text("Отмена") }
            }
        ) {
            DatePicker(state = state)
        }
    }

    if (showStartTimePicker) {
        val state = rememberTimePickerState(
            initialHour = startTime.hour,
            initialMinute = startTime.minute
        )
        DatePickerDialog(
            onDismissRequest = { showStartTimePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    startTime = LocalTime(state.hour, state.minute)
                    showStartTimePicker = false
                }) { Text("ОК") }
            },
            dismissButton = {
                TextButton(onClick = { showStartTimePicker = false }) { Text("Отмена") }
            }
        ) {
            TimePicker(state = state)
        }
    }

    if (showEndTimePicker) {
        val state = rememberTimePickerState(
            initialHour = endTime.hour,
            initialMinute = endTime.minute
        )
        DatePickerDialog(
            onDismissRequest = { showEndTimePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    endTime = LocalTime(state.hour, state.minute)
                    showEndTimePicker = false
                }) { Text("ОК") }
            },
            dismissButton = {
                TextButton(onClick = { showEndTimePicker = false }) { Text("Отмена") }
            }
        ) {
            TimePicker(state = state)
        }
    }
}

private fun tryParseDate(iso: String): LocalDate? {
    return try {
        Instant.parse(iso).toLocalDateTime(TimeZone.currentSystemDefault()).date
    } catch (_: Exception) {
        try { LocalDate.parse(iso.take(10)) } catch (_: Exception) { null }
    }
}

private fun tryParseTime(iso: String): LocalTime? {
    return try {
        Instant.parse(iso).toLocalDateTime(TimeZone.currentSystemDefault()).time
    } catch (_: Exception) { null }
}
