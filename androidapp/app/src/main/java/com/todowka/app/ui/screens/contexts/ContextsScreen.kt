package com.todowka.app.ui.screens.contexts

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.ContextEntity
import org.koin.compose.koinInject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContextsScreen(
    onAddContext: () -> Unit = {},
    viewModel: ContextsViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Контексты") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddContext) {
                Icon(Icons.Default.Add, contentDescription = "Добавить контекст")
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
                items(state.contexts, key = { it.id }) { context ->
                    Card(
                        modifier = Modifier.padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        ListItem(
                            headlineContent = {
                                Text(text = context.name, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            },
                            leadingContent = {
                                if (context.color != null) {
                                    Card(
                                        colors = CardDefaults.cardColors(
                                            containerColor = try {
                                                androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor(context.color))
                                            } catch (_: Exception) {
                                                MaterialTheme.colorScheme.primary
                                            }
                                        )
                                    ) {
                                        Box(modifier = Modifier.padding(8.dp))
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}
