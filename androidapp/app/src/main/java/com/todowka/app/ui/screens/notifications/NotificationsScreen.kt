package com.todowka.app.ui.screens.notifications

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.data.remote.dto.response.NotificationResponse
import org.koin.compose.koinInject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    viewModel: NotificationsViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Уведомления${if (state.unreadCount > 0) " (${state.unreadCount})" else ""}") },
                actions = {
                    if (state.unreadCount > 0) {
                        IconButton(onClick = viewModel::markAllAsRead) {
                            Icon(Icons.Default.DoneAll, contentDescription = "Прочитать все")
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (state.notifications.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Нет уведомлений", style = MaterialTheme.typography.bodyLarge)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(vertical = 4.dp, horizontal = 16.dp)
            ) {
                items(state.notifications, key = { it.id }) { notification ->
                    Card(
                        modifier = Modifier.padding(vertical = 2.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (!notification.isRead) {
                                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                            } else {
                                MaterialTheme.colorScheme.surface
                            }
                        )
                    ) {
                        ListItem(
                            headlineContent = { Text(notification.message) },
                            supportingContent = {
                                Text(
                                    notification.createdAt,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            },
                            modifier = Modifier.then(
                                if (!notification.isRead) {
                                    Modifier.padding(horizontal = 4.dp)
                                } else {
                                    Modifier
                                }
                            )
                        )
                    }
                }
            }
        }
    }
}
