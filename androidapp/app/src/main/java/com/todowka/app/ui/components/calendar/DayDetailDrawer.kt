package com.todowka.app.ui.components.calendar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.CalendarEventEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import kotlinx.datetime.LocalDate
import kotlinx.datetime.Month

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DayDetailDrawer(
    date: LocalDate,
    allDayEvents: List<CalendarEventEntity>,
    timedEvents: List<CalendarEventEntity>,
    tasks: List<TaskEntity>,
    onEventClick: (String) -> Unit,
    onTaskClick: (String) -> Unit,
    onToggleTaskComplete: (String) -> Unit,
    onAddEvent: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = formatDayTitle(date),
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold
                )
            )

            if (allDayEvents.isNotEmpty()) {
                Text(
                    text = "Весь день",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                allDayEvents.forEach { event ->
                    CalendarEventCard(
                        event = event,
                        onClick = { onEventClick(event.id) }
                    )
                }
                HorizontalDivider()
            }

            if (timedEvents.isNotEmpty()) {
                Text(
                    text = "События",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                timedEvents.forEach { event ->
                    CalendarEventCard(
                        event = event,
                        onClick = { onEventClick(event.id) }
                    )
                }
            }

            if (tasks.isNotEmpty()) {
                if (timedEvents.isNotEmpty() || allDayEvents.isNotEmpty()) {
                    HorizontalDivider()
                }
                Text(
                    text = "Задачи",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                tasks.forEach { task ->
                    CalendarTaskCard(
                        task = task,
                        onToggleComplete = { onToggleTaskComplete(task.id) },
                        onClick = { onTaskClick(task.id) }
                    )
                }
            }

            if (allDayEvents.isEmpty() && timedEvents.isEmpty() && tasks.isEmpty()) {
                Text(
                    text = "Нет событий и задач",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = onAddEvent,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Text("Добавить событие")
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

private fun formatDayTitle(date: LocalDate): String {
    val monthName = monthNameRu(date.month)
    val dayOfWeek = dayOfWeekRu(date)
    return "${date.dayOfMonth} $monthName ${date.year}, $dayOfWeek"
}

private fun monthNameRu(month: Month): String = when (month) {
    Month.JANUARY -> "января"
    Month.FEBRUARY -> "февраля"
    Month.MARCH -> "марта"
    Month.APRIL -> "апреля"
    Month.MAY -> "мая"
    Month.JUNE -> "июня"
    Month.JULY -> "июля"
    Month.AUGUST -> "августа"
    Month.SEPTEMBER -> "сентября"
    Month.OCTOBER -> "октября"
    Month.NOVEMBER -> "ноября"
    Month.DECEMBER -> "декабря"
}

private fun dayOfWeekRu(date: LocalDate): String = when (date.dayOfWeek) {
    kotlinx.datetime.DayOfWeek.MONDAY -> "понедельник"
    kotlinx.datetime.DayOfWeek.TUESDAY -> "вторник"
    kotlinx.datetime.DayOfWeek.WEDNESDAY -> "среда"
    kotlinx.datetime.DayOfWeek.THURSDAY -> "четверг"
    kotlinx.datetime.DayOfWeek.FRIDAY -> "пятница"
    kotlinx.datetime.DayOfWeek.SATURDAY -> "суббота"
    kotlinx.datetime.DayOfWeek.SUNDAY -> "воскресенье"
}
