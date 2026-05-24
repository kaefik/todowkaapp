package com.todowka.app.ui.screens.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.todowka.app.data.remote.dto.response.UserResponse

@Composable
fun SettingsProfileTab(
    user: UserResponse?,
    onSave: (username: String, email: String, timezone: String?, language: String?) -> Unit
) {
    var username by remember { mutableStateOf(user?.username ?: "") }
    var email by remember { mutableStateOf(user?.email ?: "") }
    var timezone by remember { mutableStateOf(user?.timezone ?: "") }
    var language by remember { mutableStateOf(user?.language ?: "ru") }

    Column(modifier = Modifier.padding(16.dp)) {
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("Имя пользователя") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
        )
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = timezone,
            onValueChange = { timezone = it },
            label = { Text("Часовой пояс") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = language,
            onValueChange = { language = it },
            label = { Text("Язык") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = { onSave(username, email, timezone.ifBlank { null }, language.ifBlank { null }) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Сохранить")
        }
    }
}
