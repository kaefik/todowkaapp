package com.todowka.app.ui.screens.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import org.koin.compose.koinInject

private val TABS_ALL = listOf("Профиль", "Общие", "Внешний вид", "Безопасность", "Глаголы")
private val TABS_GUEST = listOf("Общие", "Внешний вид", "Глаголы")

@Composable
fun SettingsScreen(
    onBack: () -> Unit = {},
    viewModel: SettingsViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()
    val isGuestMode = state.isGuestMode
    val tabs = if (isGuestMode) TABS_GUEST else TABS_ALL
    var selectedTab by remember { mutableIntStateOf(0) }

    if (selectedTab >= tabs.size) {
        selectedTab = 0
    }

    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        TabRow(selectedTabIndex = selectedTab) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(title) }
                )
            }
        }

        if (isGuestMode) {
            when (selectedTab) {
                0 -> SettingsGeneralTab(
                    defaultSection = state.defaultSection,
                    capitalizeFirst = true,
                    reviewFrequencyDays = 7,
                    reviewNotificationsEnabled = true,
                    serverUrl = state.serverUrl,
                    isGuestMode = true,
                    onDefaultSectionChange = { viewModel.updateDefaultSection(it) },
                    onCapitalizeFirstChange = {},
                    onReviewFrequencyChange = {},
                    onReviewNotificationsChange = {},
                    onServerUrlChange = { viewModel.updateServerUrl(it) }
                )
                1 -> SettingsAppearanceTab(
                    darkMode = state.darkMode,
                    onDarkModeChange = { viewModel.updateDarkMode(it) }
                )
                2 -> SettingsVerbsTab(
                    templates = state.verbTemplates,
                    onAdd = { _, _ -> },
                    onDelete = {},
                    onReset = {}
                )
            }
        } else {
            when (selectedTab) {
                0 -> SettingsProfileTab(
                    user = state.user,
                    onSave = { username, email, timezone, language ->
                        viewModel.updateProfile(username, email, timezone, language)
                    }
                )
                1 -> SettingsGeneralTab(
                    defaultSection = state.defaultSection,
                    capitalizeFirst = true,
                    reviewFrequencyDays = 7,
                    reviewNotificationsEnabled = true,
                    serverUrl = state.serverUrl,
                    onDefaultSectionChange = { viewModel.updateDefaultSection(it) },
                    onCapitalizeFirstChange = {},
                    onReviewFrequencyChange = {},
                    onReviewNotificationsChange = {},
                    onServerUrlChange = { viewModel.updateServerUrl(it) }
                )
                2 -> SettingsAppearanceTab(
                    darkMode = state.darkMode,
                    onDarkModeChange = { viewModel.updateDarkMode(it) }
                )
                3 -> SettingsSecurityTab(
                    sessions = state.sessions,
                    onChangePassword = { _, _ -> },
                    onRevokeAllSessions = {},
                    onDeleteAccount = {}
                )
                4 -> SettingsVerbsTab(
                    templates = state.verbTemplates,
                    onAdd = { _, _ -> },
                    onDelete = {},
                    onReset = {}
                )
            }
        }
    }
}
