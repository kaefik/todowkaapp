package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import org.json.JSONArray

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecurrenceEditor(
    type: String?,
    config: String?,
    endDate: String?,
    onChange: (type: String?, config: String?, endDate: String?) -> Unit,
    modifier: Modifier = Modifier
) {
    val types = remember {
        listOf(null to "Нет", "daily" to "День", "weekly" to "Неделя", "monthly" to "Месяц", "yearly" to "Год")
    }

    var intervalValue by remember {
        mutableStateOf(
            try {
                config?.let {
                    org.json.JSONObject(it).optInt("interval", 1)
                } ?: 1
            } catch (_: Exception) { 1 }
        )
    }

    var selectedDays by remember {
        mutableStateOf(
            try {
                config?.let {
                    val arr = org.json.JSONObject(it).optJSONArray("days")
                    if (arr != null) {
                        (0 until arr.length()).map { arr.getInt(it) }.toSet()
                    } else emptySet()
                } ?: emptySet()
            } catch (_: Exception) { emptySet() }
        )
    }

    var showEndDatePicker by remember { mutableStateOf(false) }

    val unitLabel = when (type) {
        "daily" -> if (intervalValue == 1) "день" else "дней"
        "weekly" -> if (intervalValue == 1) "неделю" else "недель"
        "monthly" -> if (intervalValue == 1) "месяц" else "месяцев"
        "yearly" -> if (intervalValue == 1) "год" else "лет"
        else -> ""
    }

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            types.forEach { (value, label) ->
                FilterChip(
                    selected = type == value,
                    onClick = {
                        val newConfig = if (value != null) {
                            buildConfigJson(intervalValue, if (value == "weekly") selectedDays else emptySet())
                        } else null
                        onChange(value, newConfig, if (value != null) endDate else null)
                    },
                    label = { Text(label, style = MaterialTheme.typography.labelSmall) }
                )
            }
        }

        if (type != null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Каждые", style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.width(8.dp))
                OutlinedTextField(
                    value = intervalValue.toString(),
                    onValueChange = { newText ->
                        val parsed = newText.toIntOrNull()
                        if (parsed != null && parsed > 0) {
                            intervalValue = parsed
                            val newConfig = buildConfigJson(
                                parsed,
                                if (type == "weekly") selectedDays else emptySet()
                            )
                            onChange(type, newConfig, endDate)
                        }
                    },
                    modifier = Modifier.width(60.dp),
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(unitLabel, style = MaterialTheme.typography.bodySmall)
            }

            if (type == "weekly") {
                val dayLabels = remember {
                    listOf("Пн" to DayOfWeek.MONDAY, "Вт" to DayOfWeek.TUESDAY,
                        "Ср" to DayOfWeek.WEDNESDAY, "Чт" to DayOfWeek.THURSDAY,
                        "Пт" to DayOfWeek.FRIDAY, "Сб" to DayOfWeek.SATURDAY,
                        "Вс" to DayOfWeek.SUNDAY)
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    dayLabels.forEach { (label, dow) ->
                        val isoDay = dow.ordinal + 1
                        FilterChip(
                            selected = isoDay in selectedDays,
                            onClick = {
                                val newDays = if (isoDay in selectedDays) {
                                    selectedDays - isoDay
                                } else {
                                    selectedDays + isoDay
                                }
                                selectedDays = newDays
                                val newConfig = buildConfigJson(intervalValue, newDays)
                                onChange(type, newConfig, endDate)
                            },
                            label = { Text(label, style = MaterialTheme.typography.labelSmall) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("До", style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.width(8.dp))
                val dateText = endDate?.let {
                    try {
                        Instant.parse(it).toLocalDateTime(TimeZone.currentSystemDefault()).date.toString()
                    } catch (_: Exception) {
                        try { LocalDate.parse(it.take(10)).toString() } catch (_: Exception) { it }
                    }
                } ?: "не ограничено"

                OutlinedTextField(
                    value = dateText,
                    onValueChange = {},
                    modifier = Modifier.weight(1f),
                    readOnly = true,
                    enabled = false,
                    shape = RoundedCornerShape(8.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(onClick = { showEndDatePicker = true }) {
                    Text("Выбрать")
                }
                if (endDate != null) {
                    TextButton(onClick = { onChange(type, config, null) }) {
                        Text("Сбросить")
                    }
                }
            }
        }
    }

    if (showEndDatePicker) {
        val state = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showEndDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { millis ->
                        val picked = Instant.fromEpochMilliseconds(millis)
                            .toLocalDateTime(TimeZone.currentSystemDefault()).date
                        val endInstant = "${picked}T23:59:59Z"
                        onChange(type, config, endInstant)
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
}

private fun buildConfigJson(interval: Int, days: Set<Int>): String {
    val obj = org.json.JSONObject()
    obj.put("interval", interval)
    if (days.isNotEmpty()) {
        val arr = JSONArray()
        days.sorted().forEach { arr.put(it) }
        obj.put("days", arr)
    }
    return obj.toString()
}
