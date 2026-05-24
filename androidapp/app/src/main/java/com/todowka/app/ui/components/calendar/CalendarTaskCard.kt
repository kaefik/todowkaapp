package com.todowka.app.ui.components.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Checkbox
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
import com.todowka.app.data.local.db.entity.TaskEntity
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

@Composable
fun CalendarTaskCard(
    task: TaskEntity,
    onToggleComplete: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colorScheme = MaterialTheme.colorScheme
    val statusColor = remember(task.gtdStatus, colorScheme) {
        when (task.gtdStatus) {
            "inbox" -> colorScheme.tertiary
            "next" -> colorScheme.primary
            "waiting" -> colorScheme.secondary
            "someday" -> colorScheme.onSurfaceVariant
            "reference" -> colorScheme.outline
            else -> colorScheme.onSurfaceVariant
        }
    }

    val dueTime = remember(task.dueDate) {
        task.dueDate?.let {
            try {
                val ldt = Instant.parse(it)
                    .toLocalDateTime(TimeZone.currentSystemDefault())
                String.format("%02d:%02d", ldt.hour, ldt.minute)
            } catch (_: Exception) {
                null
            }
        }
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            .clickable(onClick = onClick)
            .padding(horizontal = 4.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(
            checked = task.isCompleted,
            onCheckedChange = { onToggleComplete() },
            modifier = Modifier.size(20.dp)
        )

        Spacer(modifier = Modifier.width(4.dp))

        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(statusColor)
        )

        Spacer(modifier = Modifier.width(4.dp))

        Column(
            modifier = Modifier.weight(1f)
        ) {
            Text(
                text = task.title,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontWeight = FontWeight.Medium,
                    fontSize = 12.sp
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                color = if (task.isCompleted) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                else MaterialTheme.colorScheme.onSurface
            )
        }

        if (dueTime != null) {
            Text(
                text = dueTime,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 4.dp)
            )
        }
    }
}
