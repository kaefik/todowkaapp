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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.todowka.app.data.remote.dto.response.SessionResponse

@Composable
fun SettingsSecurityTab(
    sessions: List<SessionResponse>,
    onChangePassword: (current: String, new: String) -> Unit,
    onRevokeAllSessions: () -> Unit,
    onDeleteAccount: (password: String) -> Unit
) {
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var deletePassword by remember { mutableStateOf("") }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    LazyColumn(modifier = Modifier.padding(16.dp)) {
        item {
            Text(
                text = "Смена пароля",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = currentPassword,
                onValueChange = { currentPassword = it },
                label = { Text("Текущий пароль") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = newPassword,
                onValueChange = { newPassword = it },
                label = { Text("Новый пароль") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = confirmPassword,
                onValueChange = { confirmPassword = it },
                label = { Text("Подтвердите пароль") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = {
                    if (newPassword == confirmPassword && newPassword.isNotBlank()) {
                        onChangePassword(currentPassword, newPassword)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = newPassword == confirmPassword && newPassword.isNotBlank() && currentPassword.isNotBlank()
            ) {
                Text("Сменить пароль")
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Активные сессии",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onRevokeAllSessions,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Завершить все сессии")
            }
        }

        items(sessions, key = { it.id }) { session ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                ListItem(
                    headlineContent = {
                        Text(
                            buildString {
                                if (session.browser != null) append(session.browser)
                                if (session.os != null) append(" • ${session.os}")
                            }
                        )
                    },
                    supportingContent = {
                        Column {
                            if (session.ipAddress != null) {
                                Text(session.ipAddress, style = MaterialTheme.typography.bodySmall)
                            }
                            Text(session.lastActivity, style = MaterialTheme.typography.bodySmall)
                            if (session.isCurrent) {
                                Text(
                                    "Текущая сессия",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Удаление аккаунта",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.error
            )
            Spacer(modifier = Modifier.height(8.dp))
            if (showDeleteConfirm) {
                OutlinedTextField(
                    value = deletePassword,
                    onValueChange = { deletePassword = it },
                    label = { Text("Введите пароль для подтверждения") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            onDeleteAccount(deletePassword)
                            showDeleteConfirm = false
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.weight(1f),
                        enabled = deletePassword.isNotBlank()
                    ) {
                        Text("Удалить")
                    }
                    Button(
                        onClick = { showDeleteConfirm = false },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Отмена")
                    }
                }
            } else {
                Button(
                    onClick = { showDeleteConfirm = true },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Удалить аккаунт")
                }
            }
        }
    }
}
