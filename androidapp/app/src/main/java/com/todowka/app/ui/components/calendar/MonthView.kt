package com.todowka.app.ui.components.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.plus
import kotlinx.datetime.minus
import kotlinx.datetime.toLocalDateTime

@Composable
fun MonthView(
    yearMonth: YearMonth,
    tasks: List<com.todowka.app.data.local.db.entity.TaskEntity>,
    events: List<com.todowka.app.data.local.db.entity.CalendarEventEntity>,
    onDayClick: (LocalDate) -> Unit,
    selectedDate: LocalDate?,
    modifier: Modifier = Modifier
) {
    val today = remember {
        Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
    }
    val daysOfWeek = remember {
        listOf(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY)
    }
    val dayLabels = remember {
        listOf("Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс")
    }

    val firstDayOfMonth = yearMonth.atStartOfMonth()
    val startPadding = (firstDayOfMonth.dayOfWeek.ordinal - DayOfWeek.MONDAY.ordinal).let {
        if (it < 0) it + 7 else it
    }
    val startDate = firstDayOfMonth.minus(startPadding.toLong(), DateTimeUnit.DAY)
    val totalCells = 42
    val days = remember(startDate) {
        (0 until totalCells).map { i ->
            startDate.plus(i.toLong(), DateTimeUnit.DAY)
        }
    }

    val tasksByDate = remember(tasks) {
        tasks.mapNotNull { task ->
            task.dueDate?.let { date ->
                val parsed = tryParseLocalDate(date)
                parsed?.let { it to task }
            }
        }.groupBy({ it.first }, { it.second })
    }

    val eventsByDate = remember(events) {
        events.mapNotNull { event ->
            val parsed = tryParseLocalDate(event.startTime)
            parsed?.let { it to event }
        }.groupBy({ it.first }, { it.second })
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp)
        ) {
            dayLabels.forEach { label ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .padding(vertical = 4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

        (0 until 6).forEach { weekIndex ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                (0 until 7).forEach { dayIndex ->
                    val day = days[weekIndex * 7 + dayIndex]
                    val isCurrentMonth = day.month == yearMonth.month && day.year == yearMonth.year
                    val isToday = day == today
                    val isSelected = day == selectedDate
                    val dayTasks = tasksByDate[day] ?: emptyList()
                    val dayEvents = eventsByDate[day] ?: emptyList()
                    val hasItems = dayTasks.isNotEmpty() || dayEvents.isNotEmpty()

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .aspectRatio(1f)
                            .padding(1.dp)
                            .clip(CircleShape)
                            .background(
                                when {
                                    isSelected -> MaterialTheme.colorScheme.primary
                                    isToday -> MaterialTheme.colorScheme.primaryContainer
                                    else -> MaterialTheme.colorScheme.surface
                                }
                            )
                            .clickable { onDayClick(day) },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = day.dayOfMonth.toString(),
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontSize = 13.sp,
                                    fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal
                                ),
                                color = when {
                                    isSelected -> MaterialTheme.colorScheme.onPrimary
                                    isToday -> MaterialTheme.colorScheme.onPrimaryContainer
                                    isCurrentMonth -> MaterialTheme.colorScheme.onSurface
                                    else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                                }
                            )
                            if (hasItems) {
                                Spacer(modifier = Modifier.size(2.dp))
                                Row(horizontalArrangement = Arrangement.Center) {
                                    val totalDots = minOf(dayTasks.size + dayEvents.size, 3)
                                    (0 until totalDots).forEach { i ->
                                        val color = when {
                                            i < dayEvents.size -> {
                                                dayEvents.getOrNull(i)?.color?.let { parseColor(it) }
                                                    ?: MaterialTheme.colorScheme.tertiary
                                            }
                                            else -> MaterialTheme.colorScheme.primary
                                        }
                                        Box(
                                            modifier = Modifier
                                                .size(4.dp)
                                                .padding(horizontal = 0.5.dp)
                                                .clip(CircleShape)
                                                .background(
                                                    if (isSelected) MaterialTheme.colorScheme.onPrimary
                                                    else color
                                                )
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

private fun tryParseLocalDate(iso: String): LocalDate? {
    return try {
        kotlinx.datetime.Instant.parse(iso)
            .toLocalDateTime(TimeZone.currentSystemDefault()).date
    } catch (_: Exception) {
        try {
            LocalDate.parse(iso.take(10))
        } catch (_: Exception) {
            null
        }
    }
}

private fun parseColor(hex: String): androidx.compose.ui.graphics.Color {
    return try {
        val clean = hex.removePrefix("#")
        val argb = if (clean.length == 6) "FF$clean" else clean
        androidx.compose.ui.graphics.Color(argb.toLong(16))
    } catch (_: Exception) {
        androidx.compose.ui.graphics.Color.Gray
    }
}
