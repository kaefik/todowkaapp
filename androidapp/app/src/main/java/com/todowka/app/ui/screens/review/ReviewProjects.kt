package com.todowka.app.ui.screens.review

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.data.remote.dto.response.ProjectReviewItemResponse

@Composable
fun ReviewProjects(
    projects: List<ProjectReviewItemResponse>,
    onMarkComplete: (projectId: String) -> Unit,
    onAddNextAction: (projectId: String) -> Unit
) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = "Обзор проектов",
            style = MaterialTheme.typography.titleMedium
        )
        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(projects, key = { it.id }) { project ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = if (!project.hasNextAction)
                            MaterialTheme.colorScheme.errorContainer
                        else
                            MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(text = project.name, style = MaterialTheme.typography.titleSmall)
                        if (project.description != null) {
                            Text(
                                text = project.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))

                        if (project.availableTasks.isNotEmpty()) {
                            val total = project.availableTasks.size
                            val done = project.availableTasks.count { it.id in emptyList() }
                            LinearProgressIndicator(
                                progress = { if (total > 0) done.toFloat() / total else 0f },
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                        }

                        if (!project.hasNextAction) {
                            Text(
                                text = "Нет следующего действия${if (project.daysWithoutNext > 0) " (${project.daysWithoutNext} дн.)" else ""}",
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        } else {
                            Text(
                                text = "Есть следующее действие",
                                color = MaterialTheme.colorScheme.primary,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            if (!project.hasNextAction) {
                                Button(
                                    onClick = { onAddNextAction(project.id) },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                                ) {
                                    Text("Добавить действие", style = MaterialTheme.typography.labelSmall)
                                }
                            }
                            OutlinedButton(
                                onClick = { onMarkComplete(project.id) }
                            ) {
                                Text("Завершить", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }
        }
    }
}
