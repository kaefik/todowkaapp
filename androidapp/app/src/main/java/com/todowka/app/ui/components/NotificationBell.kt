package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun NotificationBell(
    unreadCount: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    IconButton(onClick = onClick, modifier = modifier) {
        BadgedBox(
            badge = {
                if (unreadCount > 0) {
                    Badge {
                        Text(
                            text = if (unreadCount > 99) "99+" else unreadCount.toString()
                        )
                    }
                }
            }
        ) {
            Icon(
                imageVector = Icons.Filled.Notifications,
                contentDescription = "Уведомления",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
