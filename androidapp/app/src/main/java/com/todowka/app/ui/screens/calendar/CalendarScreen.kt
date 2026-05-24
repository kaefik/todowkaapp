package com.todowka.app.ui.screens.calendar

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Today
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.koin.compose.koinInject
import java.time.format.DateTimeFormatter

private val VIEW_MODES = CalendarViewMode.entries
private val VIEW_LABELS = listOf("День", "Неделя", "Месяц", "Год")

@Composable
fun CalendarScreen(
    viewModel: CalendarViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()
    val pagerState = rememberPagerState(initialPage = VIEW_MODES.indexOf(state.viewMode)) { VIEW_MODES.size }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = viewModel::prev) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Назад")
            }
            Text(
                text = when (state.viewMode) {
                    CalendarViewMode.DAY -> state.currentDate.format(DateTimeFormatter.ofPattern("d MMMM yyyy"))
                    CalendarViewMode.WEEK -> "Неделя ${state.currentDate.format(DateTimeFormatter.ofPattern("d MMM"))}"
                    CalendarViewMode.MONTH -> state.currentDate.format(DateTimeFormatter.ofPattern("LLLL yyyy"))
                    CalendarViewMode.YEAR -> state.currentDate.year.toString()
                },
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.titleMedium
            )
            IconButton(onClick = viewModel::today) {
                Icon(Icons.Default.Today, contentDescription = "Сегодня")
            }
            IconButton(onClick = viewModel::next) {
                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "Вперед")
            }
        }
        TabRow(selectedTabIndex = VIEW_MODES.indexOf(state.viewMode)) {
            VIEW_MODES.forEachIndexed { index, mode ->
                Tab(
                    selected = state.viewMode == mode,
                    onClick = {
                        viewModel.changeViewMode(mode)
                        scope.launch { pagerState.animateScrollToPage(index) }
                    },
                    text = { Text(VIEW_LABELS[index]) }
                )
            }
        }
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize()
        ) { page ->
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "${VIEW_LABELS[page]}: ${state.currentDate}",
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }
    }
}
