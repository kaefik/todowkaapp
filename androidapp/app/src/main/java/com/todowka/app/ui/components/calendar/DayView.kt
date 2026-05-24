package com.todowka.app.ui.components.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.todowka.app.data.local.db.entity.CalendarEventEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import kotlinx.datetime.Clock
import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

private val HOUR_HEIGHT = 64.dp
private val TIME_LABEL_WIDTH = 48.dp

@Composable
fun DayView(
    date: LocalDate,
    events: List<CalendarEventEntity>,
    tasks: List<TaskEntity>,
    onEventClick: (String) -> Unit,
    onTaskClick: (String) -> Unit,
    onTimeSlotClick: (LocalDate, LocalTime) -> Unit,
    modifier: Modifier = Modifier
) {
    val now = remember {
        Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault())
    }
    val today = now.date
    val currentTime = now.time
    val isToday = date == today

    val allDayEvents = remember(events) {
        events.filter { it.allDay }
    }
    val timedEvents = remember(events) {
        events.filter { !it.allDay }
    }
    val dayTasks = remember(tasks) {
        tasks.filter { task ->
            task.dueDate?.let { tryParseDate(it) } == date
        }
    }

    Column(modifier = modifier.fillMaxSize()) {
        if (allDayEvents.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "Весь день",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 2.dp)
                )
                allDayEvents.forEach { event ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(4.dp))
                            .background(
                                event.color?.let { parseDayColor(it) }
                                    ?: MaterialTheme.colorScheme.tertiary.copy(alpha = 0.2f)
                            )
                            .clickable { onEventClick(event.id) }
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = event.title,
                            style = MaterialTheme.typography.bodySmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
            HorizontalDivider()
        }

        Box(modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                modifier = Modifier.fillMaxSize()
            ) {
                items(24) { hour ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(HOUR_HEIGHT)
                    ) {
                        Box(
                            modifier = Modifier
                                .width(TIME_LABEL_WIDTH)
                                .height(HOUR_HEIGHT)
                                .padding(end = 4.dp),
                            contentAlignment = Alignment.TopEnd
                        ) {
                            Text(
                                text = String.format("%02d:00", hour),
                                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(HOUR_HEIGHT)
                                .clickable { onTimeSlotClick(date, LocalTime(hour, 0)) }
                        ) {
                            HorizontalDivider(
                                modifier = Modifier.fillMaxWidth(),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                            )

                            val hourEvents = timedEvents.filter { event ->
                                tryParseHour(event.startTime) == hour
                            }
                            val hourTasks = dayTasks.filter { task ->
                                task.dueDate?.let { tryParseHour(it) } == hour
                            }

                            Column(
                                modifier = Modifier.padding(2.dp),
                                verticalArrangement = Arrangement.spacedBy(1.dp)
                            ) {
                                hourEvents.forEach { event ->
                                    val eventColor = event.color?.let { parseDayColor(it) }
                                        ?: MaterialTheme.colorScheme.tertiary.copy(alpha = 0.3f)
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(eventColor)
                                            .clickable { onEventClick(event.id) }
                                            .padding(horizontal = 6.dp, vertical = 2.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .width(3.dp)
                                                .height(14.dp)
                                                .clip(RoundedCornerShape(1.dp))
                                                .background(
                                                    event.color?.let { parseDaySolidColor(it) }
                                                        ?: MaterialTheme.colorScheme.tertiary
                                                )
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = event.title,
                                            style = MaterialTheme.typography.bodySmall,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                }
                                hourTasks.forEach { task ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
                                            .clickable { onTaskClick(task.id) }
                                            .padding(horizontal = 6.dp, vertical = 2.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = task.title,
                                            style = MaterialTheme.typography.bodySmall,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (isToday) {
                val yOffset = (currentTime.hour * HOUR_HEIGHT.value.toInt()) +
                        ((currentTime.minute / 60f) * HOUR_HEIGHT.value)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(2.dp)
                        .offset(y = yOffset.dp)
                        .background(MaterialTheme.colorScheme.error)
                )
                Box(
                    modifier = Modifier
                        .offset(y = (yOffset - 4).dp)
                        .width(8.dp)
                        .height(8.dp)
                        .offset(x = TIME_LABEL_WIDTH)
                        .background(
                            MaterialTheme.colorScheme.error,
                            RoundedCornerShape(4.dp)
                        )
                )
            }
        }
    }
}

private fun tryParseDate(iso: String): LocalDate? {
    return try {
        kotlinx.datetime.Instant.parse(iso).toLocalDateTime(TimeZone.currentSystemDefault()).date
    } catch (_: Exception) {
        try { LocalDate.parse(iso.take(10)) } catch (_: Exception) { null }
    }
}

private fun tryParseHour(iso: String): Int? {
    return try {
        kotlinx.datetime.Instant.parse(iso).toLocalDateTime(TimeZone.currentSystemDefault()).hour
    } catch (_: Exception) { null }
}

private fun parseDayColor(hex: String): androidx.compose.ui.graphics.Color {
    return try {
        val clean = hex.removePrefix("#")
        val argb = if (clean.length == 6) "FF$clean" else clean
        androidx.compose.ui.graphics.Color(argb.toLong(16)).copy(alpha = 0.25f)
    } catch (_: Exception) {
        androidx.compose.ui.graphics.Color.Gray.copy(alpha = 0.25f)
    }
}

private fun parseDaySolidColor(hex: String): androidx.compose.ui.graphics.Color {
    return try {
        val clean = hex.removePrefix("#")
        val argb = if (clean.length == 6) "FF$clean" else clean
        androidx.compose.ui.graphics.Color(argb.toLong(16))
    } catch (_: Exception) {
        androidx.compose.ui.graphics.Color.Gray
    }
}
