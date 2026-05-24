package com.todowka.app.ui.screens.onboarding

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

private val LANGUAGES = listOf("ru" to "Русский", "en" to "English", "tt" to "Татарча")
private val TIMEZONES = listOf("Europe/Moscow", "Europe/London", "America/New_York", "Asia/Tokyo", "UTC")
private val SECTIONS = listOf("inbox" to "Входящие", "today" to "Сегодня", "active" to "Активные")

@Composable
fun OnboardingScreen(
    onComplete: () -> Unit = {},
    viewModel: OnboardingViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()
    val pagerState = rememberPagerState(initialPage = 0) { 3 }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.weight(1f)
        ) { page ->
            when (page) {
                0 -> LanguageStep(
                    selected = state.language,
                    onSelect = viewModel::setLanguage
                )
                1 -> TimezoneStep(
                    selected = state.timezone,
                    onSelect = viewModel::setTimezone
                )
                2 -> DefaultSectionStep(
                    selected = state.defaultSection,
                    onSelect = viewModel::setDefaultSection
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Column(modifier = Modifier.fillMaxWidth()) {
            Button(
                onClick = {
                    if (pagerState.currentPage < 2) {
                        scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                    } else {
                        scope.launch { viewModel.complete(onComplete) }
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (pagerState.currentPage < 2) "Далее" else "Начать")
            }
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedButton(
                onClick = { scope.launch { viewModel.complete(onComplete) } },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Пропустить")
            }
        }
    }
}

@Composable
private fun LanguageStep(selected: String, onSelect: (String) -> Unit) {
    Column {
        Text("Выберите язык", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(16.dp))
        LANGUAGES.forEach { (code, name) ->
            RadioButtonRow(
                label = name,
                selected = selected == code,
                onClick = { onSelect(code) }
            )
        }
    }
}

@Composable
private fun TimezoneStep(selected: String, onSelect: (String) -> Unit) {
    Column {
        Text("Выберите часовой пояс", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(16.dp))
        TIMEZONES.forEach { tz ->
            RadioButtonRow(
                label = tz,
                selected = selected == tz,
                onClick = { onSelect(tz) }
            )
        }
    }
}

@Composable
private fun DefaultSectionStep(selected: String, onSelect: (String) -> Unit) {
    Column {
        Text("Раздел по умолчанию", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(16.dp))
        SECTIONS.forEach { (key, name) ->
            RadioButtonRow(
                label = name,
                selected = selected == key,
                onClick = { onSelect(key) }
            )
        }
    }
}

@Composable
private fun RadioButtonRow(label: String, selected: Boolean, onClick: () -> Unit) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
    ) {
        RadioButton(selected = selected, onClick = onClick)
        Text(label, modifier = Modifier.padding(start = 8.dp))
    }
}
