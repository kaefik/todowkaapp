package com.todowka.app.ui.screens.review

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.data.remote.dto.response.OverdueTaskItemResponse
import com.todowka.app.data.remote.dto.response.ProjectReviewItemResponse
import com.todowka.app.data.remote.dto.response.ReviewSummaryResponse
import com.todowka.app.data.remote.dto.response.TaskReviewItemResponse
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

private val STEPS = listOf("Дашборд", "Просроченные", "Входящие", "Проекты", "Когда-нибудь", "Завершение")

@Composable
fun ReviewScreen(
    onBack: () -> Unit = {},
    onComplete: () -> Unit = {},
    viewModel: ReviewViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()
    val pagerState = rememberPagerState(initialPage = 0) { STEPS.size }
    val scope = rememberCoroutineScope()

    if (state.isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
    } else {
        Column(modifier = Modifier.fillMaxSize()) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f)
            ) { page ->
                when (page) {
                    0 -> ReviewDashboardStep(
                        summary = state.summary,
                        overdueCount = state.overdueTasks.size,
                        inboxCount = state.inboxTasks.size,
                        projectsCount = state.projects.size,
                        somedayCount = state.somedayTasks.size
                    )
                    1 -> ReviewOverdueStep(state.overdueTasks)
                    2 -> ReviewInboxStep(state.inboxTasks)
                    3 -> ReviewProjectsStep(state.projects)
                    4 -> ReviewSomedayStep(state.somedayTasks)
                    5 -> ReviewCompletionStep(
                        isCompleting = state.isCompleting,
                        onComplete = { viewModel.completeReview(onComplete) }
                    )
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Button(
                    onClick = {
                        if (pagerState.currentPage > 0) {
                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) }
                        }
                    },
                    enabled = pagerState.currentPage > 0
                ) {
                    Text("Назад")
                }
                Text(
                    text = STEPS.getOrElse(pagerState.currentPage) { "" },
                    style = MaterialTheme.typography.labelMedium
                )
                Button(
                    onClick = {
                        if (pagerState.currentPage < STEPS.size - 1) {
                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                        }
                    },
                    enabled = pagerState.currentPage < STEPS.size - 1
                ) {
                    Text("Далее")
                }
            }
        }
    }
}

@Composable
private fun ReviewDashboardStep(
    summary: ReviewSummaryResponse?,
    overdueCount: Int,
    inboxCount: Int,
    projectsCount: Int,
    somedayCount: Int
) {
    LazyColumn(modifier = Modifier.padding(16.dp)) {
        item {
            Text("Обзор", style = MaterialTheme.typography.headlineSmall)
            Spacer(modifier = Modifier.height(16.dp))
        }
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Входящие: $inboxCount", style = MaterialTheme.typography.bodyLarge)
                    Text("Просроченные: $overdueCount", style = MaterialTheme.typography.bodyLarge)
                    Text("Проекты: $projectsCount", style = MaterialTheme.typography.bodyLarge)
                    Text("Когда-нибудь: $somedayCount", style = MaterialTheme.typography.bodyLarge)
                }
            }
        }
    }
}

@Composable
private fun ReviewOverdueStep(tasks: List<OverdueTaskItemResponse>) {
    LazyColumn(modifier = Modifier.padding(16.dp)) {
        item {
            Text("Просроченные задачи (${tasks.size})", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
        }
        items(tasks, key = { it.id }) { task ->
            ListItem(
                headlineContent = { Text(task.title) },
                supportingContent = {
                    Column {
                        if (task.dueDate != null) Text("Срок: ${task.dueDate}", style = MaterialTheme.typography.bodySmall)
                        if (task.projectName != null) Text("Проект: ${task.projectName}", style = MaterialTheme.typography.bodySmall)
                    }
                }
            )
        }
    }
}

@Composable
private fun ReviewInboxStep(tasks: List<TaskReviewItemResponse>) {
    LazyColumn(modifier = Modifier.padding(16.dp)) {
        item {
            Text("Входящие (${tasks.size})", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
        }
        items(tasks, key = { it.id }) { task ->
            ListItem(
                headlineContent = { Text(task.title) },
                supportingContent = {
                    if (task.description != null) {
                        Text(task.description, style = MaterialTheme.typography.bodySmall)
                    }
                }
            )
        }
    }
}

@Composable
private fun ReviewProjectsStep(projects: List<ProjectReviewItemResponse>) {
    LazyColumn(modifier = Modifier.padding(16.dp)) {
        item {
            Text("Проекты (${projects.size})", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
        }
        items(projects, key = { it.id }) { project ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(project.name, style = MaterialTheme.typography.titleSmall)
                    if (project.description != null) {
                        Text(project.description, style = MaterialTheme.typography.bodySmall)
                    }
                    Text(
                        if (project.hasNextAction) "Есть следующее действие" else "Нет следующего действия",
                        color = if (project.hasNextAction) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

@Composable
private fun ReviewSomedayStep(tasks: List<TaskReviewItemResponse>) {
    LazyColumn(modifier = Modifier.padding(16.dp)) {
        item {
            Text("Когда-нибудь/Может быть (${tasks.size})", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
        }
        items(tasks, key = { it.id }) { task ->
            ListItem(
                headlineContent = { Text(task.title) },
                supportingContent = {
                    if (task.description != null) {
                        Text(task.description, style = MaterialTheme.typography.bodySmall)
                    }
                }
            )
        }
    }
}

@Composable
private fun ReviewCompletionStep(isCompleting: Boolean, onComplete: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Обзор завершен!", style = MaterialTheme.typography.headlineSmall)
            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = onComplete,
                enabled = !isCompleting
            ) {
                if (isCompleting) {
                    CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp))
                }
                Text("Завершить обзор")
            }
        }
    }
}
