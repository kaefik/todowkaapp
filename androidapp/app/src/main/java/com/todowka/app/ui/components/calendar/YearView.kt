package com.todowka.app.ui.components.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import com.todowka.app.data.local.db.entity.CalendarEventEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.plus
import kotlinx.datetime.minus
import kotlinx.datetime.toLocalDateTime

@Composable
fun YearView(
    year: Int,
    tasks: List<TaskEntity>,
    events: List<CalendarEventEntity>,
    onMonthClick: (YearMonth) -> Unit,
    modifier: Modifier = Modifier
) {
    val today = remember {
        Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
    }
    val months = remember(year) {
        (1..12).map { month -> YearMonth(year, kotlinx.datetime.Month(month)) }
    }

    val datesWithItems = remember(tasks, events, year) {
        val dateSet = mutableSetOf<LocalDate>()
        events.forEach { event ->
            tryParseDate(event.startTime)?.let { dateSet.add(it) }
        }
        tasks.forEach { task ->
            task.dueDate?.let { tryParseDate(it) }?.let { dateSet.add(it) }
        }
        dateSet
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(months) { yearMonth ->
            MiniMonth(
                yearMonth = yearMonth,
                today = today,
                datesWithItems = datesWithItems,
                onClick = { onMonthClick(yearMonth) }
            )
        }
    }
}

@Composable
private fun MiniMonth(
    yearMonth: YearMonth,
    today: LocalDate,
    datesWithItems: Set<LocalDate>,
    onClick: () -> Unit
) {
    val monthNames = remember {
        listOf("Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек")
    }
    val dayLabels = remember {
        listOf("П", "В", "С", "Ч", "П", "С", "В")
    }

    val firstDay = yearMonth.atStartOfMonth()
    val startPadding = (firstDay.dayOfWeek.ordinal - DayOfWeek.MONDAY.ordinal).let {
        if (it < 0) it + 7 else it
    }
    val startDate = firstDay.minus(startPadding.toLong(), DateTimeUnit.DAY)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            .clickable(onClick = onClick)
            .padding(6.dp)
    ) {
        Text(
            text = monthNames[yearMonth.monthNumber - 1],
            style = MaterialTheme.typography.labelMedium.copy(
                fontWeight = FontWeight.SemiBold
            ),
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 4.dp),
            textAlign = TextAlign.Center
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            dayLabels.forEach { label ->
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 8.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center
                )
            }
        }

        (0 until 6).forEach { weekIdx ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                (0 until 7).forEach { dayIdx ->
                    val day = startDate.plus((weekIdx * 7 + dayIdx).toLong(), DateTimeUnit.DAY)
                    val isCurrentMonth = day.month == yearMonth.month && day.year == yearMonth.year
                    val isToday = day == today
                    val hasItems = day in datesWithItems

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .aspectRatio(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isToday) {
                            Box(
                                modifier = Modifier
                                    .size(16.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primary)
                            )
                        }
                        Text(
                            text = if (isCurrentMonth) day.dayOfMonth.toString() else "",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontSize = 8.sp,
                                fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal
                            ),
                            color = when {
                                isToday -> MaterialTheme.colorScheme.onPrimary
                                isCurrentMonth -> MaterialTheme.colorScheme.onSurface
                                else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                            },
                            textAlign = TextAlign.Center
                        )
                        if (hasItems && isCurrentMonth && !isToday) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .size(3.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primary)
                            )
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
