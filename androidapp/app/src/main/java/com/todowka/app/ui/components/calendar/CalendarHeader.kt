package com.todowka.app.ui.components.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import kotlinx.datetime.LocalDate
import kotlinx.datetime.Month

@Composable
fun CalendarHeader(
    currentDate: LocalDate,
    viewMode: CalendarViewMode,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onToday: () -> Unit,
    onViewModeChange: (CalendarViewMode) -> Unit,
    modifier: Modifier = Modifier
) {
    val shape = RoundedCornerShape(8.dp)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = formatHeaderTitle(currentDate, viewMode),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.weight(1f)
        )

        Text(
            text = "Сегодня",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier
                .clip(RoundedCornerShape(6.dp))
                .clickable(onClick = onToday)
                .padding(horizontal = 12.dp, vertical = 6.dp)
        )

        IconButton(onClick = onPrev, modifier = Modifier.size(36.dp)) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = "Назад"
            )
        }

        IconButton(onClick = onNext, modifier = Modifier.size(36.dp)) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = "Вперёд"
            )
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.Center
    ) {
        CalendarViewMode.entries.forEach { mode ->
            val isSelected = viewMode == mode
            val label = when (mode) {
                CalendarViewMode.DAY -> "День"
                CalendarViewMode.WEEK -> "Неделя"
                CalendarViewMode.MONTH -> "Месяц"
                CalendarViewMode.YEAR -> "Год"
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(36.dp)
                    .clip(if (mode == CalendarViewMode.entries.first()) RoundedCornerShape(topStart = 8.dp, bottomStart = 8.dp) else if (mode == CalendarViewMode.entries.last()) RoundedCornerShape(topEnd = 8.dp, bottomEnd = 8.dp) else RoundedCornerShape(0.dp))
                    .background(if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                    .then(if (!isSelected) Modifier.border(0.5.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(0.dp)) else Modifier)
                    .clickable { onViewModeChange(mode) },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelMedium,
                    color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

private fun formatHeaderTitle(date: LocalDate, viewMode: CalendarViewMode): String {
    val monthName = monthNameRu(date.month)
    return when (viewMode) {
        CalendarViewMode.DAY -> "${date.dayOfMonth} $monthName ${date.year}"
        CalendarViewMode.WEEK -> "$monthName ${date.year}"
        CalendarViewMode.MONTH -> "$monthName ${date.year}"
        CalendarViewMode.YEAR -> "${date.year}"
    }
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
