package com.todowka.app.ui.screens.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.VerbTemplateEntity

@Composable
fun SettingsVerbsTab(
    templates: List<VerbTemplateEntity>,
    onAdd: (text: String, icon: String?) -> Unit,
    onDelete: (templateId: String) -> Unit,
    onReset: () -> Unit
) {
    var newVerbText by remember { mutableStateOf("") }

    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = "Шаблоны глаголов",
            style = MaterialTheme.typography.titleMedium
        )
        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = newVerbText,
                onValueChange = { newVerbText = it },
                label = { Text("Новый глагол") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
            IconButton(
                onClick = {
                    if (newVerbText.isNotBlank()) {
                        onAdd(newVerbText, null)
                        newVerbText = ""
                    }
                }
            ) {
                Icon(Icons.Default.Add, contentDescription = "Добавить")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            itemsIndexed(templates, key = { _, t -> t.id }) { _, template ->
                ListItem(
                    headlineContent = { Text(template.text) },
                    leadingContent = {
                        Icon(
                            Icons.Default.DragHandle,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.outline
                        )
                    },
                    trailingContent = {
                        IconButton(onClick = { onDelete(template.id) }) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Удалить",
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedButton(
            onClick = onReset,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Сбросить к значениям по умолчанию")
        }
    }
}
