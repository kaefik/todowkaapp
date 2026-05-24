package com.todowka.app.ui.components.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Icon
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
import com.todowka.app.data.local.db.entity.CalendarEventEntity
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

@Composable
fun CalendarEventCard(
    event: CalendarEventEntity,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colorScheme = MaterialTheme.colorScheme
    val borderColor = remember(event.color, colorScheme) {
        event.color?.let { parseCardColor(it) } ?: colorScheme.tertiary
    }

    val timeRange = remember(event.startTime, event.endTime) {
        val start = tryFormatTime(event.startTime)
        val end = event.endTime?.let { tryFormatTime(it) }
        if (event.allDay) {
            "Весь день"
        } else if (end != null) {
            "$start – $end"
        } else {
            start
        }
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .clickable(onClick = onClick)
            .padding(start = 0.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(4.dp)
                .height(36.dp)
                .clip(RoundedCornerShape(topStart = 6.dp, bottomStart = 6.dp))
                .background(borderColor)
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 8.dp, vertical = 6.dp)
        ) {
            Text(
                text = event.title,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                color = MaterialTheme.colorScheme.onSurface
            )
            if (!event.allDay) {
                Text(
                    text = timeRange,
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (!event.location.isNullOrBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 1.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(10.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = event.location,
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

private fun tryFormatTime(iso: String): String {
    return try {
        val ldt = Instant.parse(iso).toLocalDateTime(TimeZone.currentSystemDefault())
        String.format("%02d:%02d", ldt.hour, ldt.minute)
    } catch (_: Exception) {
        iso.take(16).removePrefix("T")
    }
}

private fun parseCardColor(hex: String): androidx.compose.ui.graphics.Color {
    return try {
        val clean = hex.removePrefix("#")
        val argb = if (clean.length == 6) "FF$clean" else clean
        androidx.compose.ui.graphics.Color(argb.toLong(16))
    } catch (_: Exception) {
        androidx.compose.ui.graphics.Color.Gray
    }
}
