package com.todowka.app.ui.screens.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsGeneralTab(
    defaultSection: String,
    capitalizeFirst: Boolean,
    reviewFrequencyDays: Int,
    reviewNotificationsEnabled: Boolean,
    serverUrl: String,
    isGuestMode: Boolean = false,
    onDefaultSectionChange: (String) -> Unit,
    onCapitalizeFirstChange: (Boolean) -> Unit,
    onReviewFrequencyChange: (Int) -> Unit,
    onReviewNotificationsChange: (Boolean) -> Unit,
    onServerUrlChange: (String) -> Unit
) {
    var sectionExpanded by remember { mutableStateOf(false) }
    val sections = listOf("inbox", "active", "today", "next", "someday")
    val sectionLabels = mapOf(
        "inbox" to "Входящие",
        "active" to "Активные",
        "today" to "Сегодня",
        "next" to "Следующие",
        "someday" to "Когда-нибудь"
    )

    Column(modifier = Modifier.padding(16.dp)) {
        ExposedDropdownMenuBox(
            expanded = sectionExpanded,
            onExpandedChange = { sectionExpanded = it }
        ) {
            OutlinedTextField(
                value = sectionLabels[defaultSection] ?: defaultSection,
                onValueChange = {},
                readOnly = true,
                label = { Text("Раздел по умолчанию") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = sectionExpanded) },
                modifier = Modifier.fillMaxWidth().menuAnchor()
            )
            ExposedDropdownMenu(
                expanded = sectionExpanded,
                onDismissRequest = { sectionExpanded = false }
            ) {
                sections.forEach { section ->
                    DropdownMenuItem(
                        text = { Text(sectionLabels[section] ?: section) },
                        onClick = {
                            onDefaultSectionChange(section)
                            sectionExpanded = false
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        SwitchRow(
            label = "Капитализация первой буквы",
            checked = capitalizeFirst,
            onCheckedChange = onCapitalizeFirstChange
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Периодичность обзора: $reviewFrequencyDays дн.",
            style = MaterialTheme.typography.bodyMedium
        )
        Slider(
            value = reviewFrequencyDays.toFloat(),
            onValueChange = { onReviewFrequencyChange(it.toInt()) },
            valueRange = 1f..30f,
            steps = 28,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        SwitchRow(
            label = "Уведомления об обзоре",
            checked = reviewNotificationsEnabled,
            onCheckedChange = onReviewNotificationsChange
        )

        Spacer(modifier = Modifier.height(24.dp))

        var urlValue by remember(serverUrl) { mutableStateOf(serverUrl) }

        OutlinedTextField(
            value = urlValue,
            onValueChange = {
                urlValue = it
                onServerUrlChange(it)
            },
            label = { Text("URL сервера") },
            supportingText = {
                if (isGuestMode) {
                    Text("Укажите URL сервера для входа в аккаунт")
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Switch(checked = checked, onCheckedChange = onCheckedChange)
    Text(text = label, style = MaterialTheme.typography.bodyMedium)
}
