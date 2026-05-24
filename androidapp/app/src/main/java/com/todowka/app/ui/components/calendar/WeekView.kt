package com.todowka.app.ui.components.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.minus
import kotlinx.datetime.plus
import kotlinx.datetime.toLocalDateTime

private val HOUR_HEIGHT = 48.dp
private val TIME_LABEL_WIDTH = 44.dp
private val DAY_COLUMN_WIDTH = 100.dp

@Composable
fun WeekView(
    startDate: LocalDate,
    tasks: List<com.todowka.app.data.local.db.entity.TaskEntity>,
    events: List<com.todowka.app.data.local.db.entity.CalendarEventEntity>,
    onEventClick: (String) -> Unit,
    onTaskClick: (String) -> Unit,
    onTimeSlotClick: (LocalDate, LocalTime) -> Unit,
    modifier: Modifier = Modifier
) {
    val today = remember {
        Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
    }
    val now = remember {
        Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).time
    }

    val weekStart = remember(startDate) {
        val dow = startDate.dayOfWeek
        val offset = (dow.ordinal - DayOfWeek.MONDAY.ordinal).let { if (it < 0) it + 7 else it }
        startDate.minus(offset.toLong(), DateTimeUnit.DAY)
    }
    val weekDays = remember(weekStart) {
        (0 until 7).map { weekStart.plus(it.toLong(), DateTimeUnit.DAY) }
    }
    val dayLabels = remember {
        listOf("Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс")
    }

    val scrollState = rememberScrollState()

    Column(modifier = modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .horizontalScroll(scrollState)
        ) {
            Spacer(modifier = Modifier.width(TIME_LABEL_WIDTH))
            weekDays.forEachIndexed { index, day ->
                val isToday = day == today
                Column(
                    modifier = Modifier
                        .width(DAY_COLUMN_WIDTH)
                        .padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = dayLabels[index],
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Box(
                        modifier = Modifier
                            .width(32.dp)
                            .height(32.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (isToday) MaterialTheme.colorScheme.primary else androidx.compose.ui.graphics.Color.Transparent),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = day.dayOfMonth.toString(),
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal
                            ),
                            color = if (isToday) MaterialTheme.colorScheme.onPrimary
                            else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }

        HorizontalDivider()

        LazyColumn(
            modifier = Modifier.fillMaxSize()
        ) {
            items(24) { hour ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(HOUR_HEIGHT)
                        .horizontalScroll(scrollState)
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

                    weekDays.forEachIndexed { _, day ->
                        val hourTime = LocalTime(hour, 0)
                        val cellEvents = events.filter { event ->
                            val eventDate = tryParseDate(event.startTime)
                            val eventStartHour = tryParseHour(event.startTime)
                            eventDate == day && eventStartHour == hour && !event.allDay
                        }
                        val cellTasks = tasks.filter { task ->
                            val taskDate = task.dueDate?.let { tryParseDate(it) }
                            val taskHour = task.dueDate?.let { tryParseHour(it) }
                            taskDate == day && taskHour == hour
                        }

                        Box(
                            modifier = Modifier
                                .width(DAY_COLUMN_WIDTH)
                                .height(HOUR_HEIGHT)
                                .clickable { onTimeSlotClick(day, hourTime) }
                        ) {
                            if (day == today && hour == now.hour) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(2.dp)
                                        .offset(y = ((now.minute / 60f) * HOUR_HEIGHT.value).dp)
                                        .background(MaterialTheme.colorScheme.error)
                                )
                            }

                            HorizontalDivider(
                                modifier = Modifier.fillMaxWidth(),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                            )

                            Column(
                                modifier = Modifier.padding(1.dp),
                                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(1.dp)
                            ) {
                                cellEvents.forEach { event ->
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(2.dp))
                                            .background(
                                                event.color?.let { parseCalendarColor(it) }
                                                    ?: MaterialTheme.colorScheme.tertiary.copy(alpha = 0.2f)
                                            )
                                            .clickable { onEventClick(event.id) }
                                            .padding(horizontal = 4.dp, vertical = 1.dp)
                                    ) {
                                        Text(
                                            text = event.title,
                                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                }
                                cellTasks.forEach { task ->
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(2.dp))
                                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f))
                                            .clickable { onTaskClick(task.id) }
                                            .padding(horizontal = 4.dp, vertical = 1.dp)
                                    ) {
                                        Text(
                                            text = task.title,
                                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
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

private fun parseCalendarColor(hex: String): androidx.compose.ui.graphics.Color {
    return try {
        val clean = hex.removePrefix("#")
        val argb = if (clean.length == 6) "FF$clean" else clean
        androidx.compose.ui.graphics.Color(argb.toLong(16)).copy(alpha = 0.3f)
    } catch (_: Exception) {
        androidx.compose.ui.graphics.Color.Gray.copy(alpha = 0.3f)
    }
}
