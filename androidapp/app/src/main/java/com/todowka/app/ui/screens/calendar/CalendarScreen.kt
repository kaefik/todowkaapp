package com.todowka.app.ui.screens.calendar

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Today
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
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

private val VIEWS = listOf("day", "week", "month", "year")
private val VIEW_LABELS = listOf("День", "Неделя", "Месяц", "Год")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(
    viewModel: CalendarViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()
    val pagerState = rememberPagerState(initialPage = VIEWS.indexOf(state.viewType)) { VIEWS.size }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Text(
                            when (state.viewType) {
                                "day" -> state.currentDate.format(DateTimeFormatter.ofPattern("d MMMM yyyy"))
                                "week" -> "Неделя ${state.currentDate.format(DateTimeFormatter.ofPattern("d MMM"))}"
                                "month" -> state.currentDate.format(DateTimeFormatter.ofPattern("LLLL yyyy"))
                                "year" -> state.currentDate.year.toString()
                                else -> ""
                            }
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = viewModel::onPrevious) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Назад")
                        }
                    },
                    actions = {
                        IconButton(onClick = viewModel::onToday) {
                            Icon(Icons.Default.Today, contentDescription = "Сегодня")
                        }
                        IconButton(onClick = viewModel::onNext) {
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "Вперед")
                        }
                    }
                )
                TabRow(selectedTabIndex = VIEWS.indexOf(state.viewType)) {
                    VIEWS.forEachIndexed { index, view ->
                        Tab(
                            selected = state.viewType == view,
                            onClick = {
                                viewModel.onViewTypeChanged(view)
                                scope.launch { pagerState.animateScrollToPage(index) }
                            },
                            text = { Text(VIEW_LABELS[index]) }
                        )
                    }
                }
            }
        }
    ) { padding ->
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize().padding(padding)
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
