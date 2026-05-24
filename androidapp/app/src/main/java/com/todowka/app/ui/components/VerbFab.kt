package com.todowka.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AssistChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.domain.repository.VerbTemplateRepository
import org.koin.compose.koinInject

@Composable
fun VerbFab(
    userId: String,
    onVerbSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val verbRepo: VerbTemplateRepository = koinInject()
    val verbs by verbRepo.getAll(userId).collectAsState(initial = emptyList())
    var expanded by remember { mutableStateOf(false) }

    Column(
        modifier = modifier.padding(end = 16.dp, bottom = 16.dp)
    ) {
        AnimatedVisibility(
            visible = expanded,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            LazyColumn(
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                items(verbs, key = { it.id }) { verb ->
                    AssistChip(
                        onClick = {
                            onVerbSelected(verb.text)
                            expanded = false
                        },
                        label = { Text(text = verb.text) }
                    )
                }
            }
        }

        FloatingActionButton(
            onClick = { expanded = !expanded },
            containerColor = if (expanded) {
                MaterialTheme.colorScheme.error
            } else {
                MaterialTheme.colorScheme.primaryContainer
            }
        ) {
            Icon(
                imageVector = if (expanded) {
                    Icons.Filled.Close
                } else {
                    Icons.Filled.PlayArrow
                },
                contentDescription = if (expanded) "Закрыть" else "Быстрое действие"
            )
        }
    }
}
