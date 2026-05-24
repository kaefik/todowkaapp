package com.todowka.app.ui.screens.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.todowka.app.data.remote.dto.response.UserResponse

@Composable
fun SettingsAdminTab(
    users: List<UserResponse>,
    isAdmin: Boolean,
    registrationEnabled: Boolean,
    inviteCode: String,
    onBlockUser: (userId: String) -> Unit,
    onUnblockUser: (userId: String) -> Unit,
    onDeleteUser: (userId: String) -> Unit,
    onRegistrationToggle: (enabled: Boolean) -> Unit,
    onInviteCodeChange: (code: String) -> Unit
) {
    if (!isAdmin) return

    var inviteField by remember { mutableStateOf(inviteCode) }

    LazyColumn(modifier = Modifier.padding(16.dp)) {
        item {
            Text(
                text = "Администрирование",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Регистрация открыта")
                Switch(
                    checked = registrationEnabled,
                    onCheckedChange = onRegistrationToggle
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = inviteField,
                onValueChange = {
                    inviteField = it
                    onInviteCodeChange(it)
                },
                label = { Text("Инвайт-код") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Пользователи (${users.size})",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        items(users, key = { it.id }) { user ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    ListItem(
                        headlineContent = { Text(user.username) },
                        supportingContent = {
                            Column {
                                Text(user.email, style = MaterialTheme.typography.bodySmall)
                                if (user.isAdmin) {
                                    Text(
                                        "Администратор",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                                if (!user.isActive) {
                                    Text(
                                        "Заблокирован",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.error
                                    )
                                }
                            }
                        }
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        if (user.isActive) {
                            OutlinedButton(
                                onClick = { onBlockUser(user.id) }
                            ) {
                                Text("Заблокировать", style = MaterialTheme.typography.labelSmall)
                            }
                        } else {
                            OutlinedButton(
                                onClick = { onUnblockUser(user.id) }
                            ) {
                                Text("Разблокировать", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                        Button(
                            onClick = { onDeleteUser(user.id) },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                        ) {
                            Text("Удалить", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
    }
}
