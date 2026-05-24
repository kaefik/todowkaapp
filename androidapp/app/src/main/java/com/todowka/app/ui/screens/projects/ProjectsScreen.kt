package com.todowka.app.ui.screens.projects

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.ProjectEntity
import org.koin.compose.koinInject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectsScreen(
    onProjectClick: (String) -> Unit = {},
    onAddProject: () -> Unit = {},
    viewModel: ProjectsViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()
    var showSearch by remember { mutableStateOf(false) }
    val projects = viewModel.filteredProjects()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    if (showSearch) {
                        OutlinedTextField(
                            value = state.searchQuery,
                            onValueChange = viewModel::onSearchQueryChanged,
                            placeholder = { Text("Поиск проектов...") },
                            singleLine = true,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Text("Проекты")
                    }
                },
                actions = {
                    IconButton(onClick = { showSearch = !showSearch }) {
                        Icon(Icons.Default.Search, contentDescription = "Поиск")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddProject) {
                Icon(Icons.Default.Add, contentDescription = "Добавить проект")
            }
        }
    ) { padding ->
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(vertical = 8.dp, horizontal = 16.dp)
            ) {
                items(projects, key = { it.id }) { project ->
                    ProjectCard(
                        project = project,
                        onClick = { onProjectClick(project.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun ProjectCard(
    project: ProjectEntity,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        ListItem(
            headlineContent = {
                Text(
                    text = project.name,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            },
            supportingContent = {
                if (project.description != null) {
                    Text(
                        text = project.description,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            },
            leadingContent = {
                if (project.color != null) {
                    Box(
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = try {
                                    androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor(project.color))
                                } catch (_: Exception) {
                                    MaterialTheme.colorScheme.primary
                                }
                            )
                        ) {
                            Box(modifier = Modifier.padding(8.dp))
                        }
                    }
                }
            }
        )
    }
}
