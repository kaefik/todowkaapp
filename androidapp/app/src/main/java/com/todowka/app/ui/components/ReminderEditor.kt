package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.clickable

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReminderEditor(
    time: String?,
    offsets: List<Int>?,
    onChange: (time: String?, offsets: List<Int>?) -> Unit,
    modifier: Modifier = Modifier
) {
    var timeValue by remember {
        mutableStateOf(time ?: "")
    }
    var showTimePicker by remember { mutableStateOf(false) }

    val offsetPresets = remember {
        listOf(5 to "5мин", 15 to "15мин", 30 to "30мин", 60 to "1ч", 1440 to "1д")
    }

    val selectedOffsets = remember(offsets) {
        offsets?.toMutableList() ?: mutableListOf()
    }

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = timeValue,
            onValueChange = {},
            label = { Text("Точное время") },
            modifier = Modifier
                .fillMaxWidth()
                .clickable { showTimePicker = true },
            readOnly = true,
            shape = RoundedCornerShape(8.dp)
        )

        Text("Напоминания до события", style = MaterialTheme.typography.labelMedium)

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            offsetPresets.forEach { (minutes, label) ->
                FilterChip(
                    selected = minutes in selectedOffsets,
                    onClick = {
                        if (minutes in selectedOffsets) {
                            selectedOffsets.remove(minutes)
                        } else {
                            selectedOffsets.add(minutes)
                        }
                        onChange(
                            timeValue.ifBlank { null },
                            if (selectedOffsets.isNotEmpty()) selectedOffsets.toList() else null
                        )
                    },
                    label = { Text(label, style = MaterialTheme.typography.labelSmall) }
                )
            }
        }
    }

    if (showTimePicker) {
        val parsedHour = timeValue.take(2).toIntOrNull() ?: 9
        val parsedMinute = timeValue.takeLast(2).toIntOrNull() ?: 0
        val state = rememberTimePickerState(
            initialHour = parsedHour,
            initialMinute = parsedMinute
        )

        androidx.compose.material3.DatePickerDialog(
            onDismissRequest = { showTimePicker = false },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = {
                    timeValue = String.format("%02d:%02d", state.hour, state.minute)
                    onChange(
                        timeValue.ifBlank { null },
                        if (selectedOffsets.isNotEmpty()) selectedOffsets.toList() else null
                    )
                    showTimePicker = false
                }) { Text("ОК") }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(onClick = { showTimePicker = false }) {
                    Text("Отмена")
                }
            }
        ) {
            TimePicker(state = state)
        }
    }
}
