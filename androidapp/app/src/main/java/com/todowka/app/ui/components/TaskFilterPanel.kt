package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
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
import com.todowka.app.data.local.db.entity.AreaEntity
import com.todowka.app.data.local.db.entity.ContextEntity
import com.todowka.app.data.local.db.entity.ProjectEntity
import com.todowka.app.data.local.db.entity.TagEntity

enum class SortOption(val label: String) {
    POSITION("Позиция"),
    DUE_DATE("Срок"),
    TITLE("Название"),
    CREATED_AT("Дата создания")
}

enum class GroupOption(val label: String) {
    NONE("Без группировки"),
    PROJECT("По проекту"),
    CONTEXT("По контексту"),
    AREA("По области"),
    STATUS("По статусу")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskFilterPanel(
    contexts: List<ContextEntity>,
    projects: List<ProjectEntity>,
    areas: List<AreaEntity>,
    tags: List<TagEntity>,
    selectedContextId: String?,
    selectedProjectId: String?,
    selectedAreaId: String?,
    selectedTagIds: Set<String>,
    sortBy: SortOption,
    groupBy: GroupOption,
    onContextSelected: (String?) -> Unit,
    onProjectSelected: (String?) -> Unit,
    onAreaSelected: (String?) -> Unit,
    onTagSelected: (String) -> Unit,
    onTagDeselected: (String) -> Unit,
    onSortChanged: (SortOption) -> Unit,
    onGroupChanged: (GroupOption) -> Unit,
    modifier: Modifier = Modifier
) {
    var contextExpanded by remember { mutableStateOf(false) }
    var projectExpanded by remember { mutableStateOf(false) }
    var areaExpanded by remember { mutableStateOf(false) }
    var sortExpanded by remember { mutableStateOf(false) }
    var groupExpanded by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ExposedDropdownMenuBox(
                expanded = contextExpanded,
                onExpandedChange = { contextExpanded = it },
                modifier = Modifier.weight(1f)
            ) {
                OutlinedTextField(
                    value = contexts.find { it.id == selectedContextId }?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Контекст") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = contextExpanded) },
                    modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable)
                )
                ExposedDropdownMenu(
                    expanded = contextExpanded,
                    onDismissRequest = { contextExpanded = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Все") },
                        onClick = { onContextSelected(null); contextExpanded = false }
                    )
                    contexts.forEach { ctx ->
                        DropdownMenuItem(
                            text = { Text(ctx.name) },
                            onClick = { onContextSelected(ctx.id); contextExpanded = false }
                        )
                    }
                }
            }

            ExposedDropdownMenuBox(
                expanded = projectExpanded,
                onExpandedChange = { projectExpanded = it },
                modifier = Modifier.weight(1f)
            ) {
                OutlinedTextField(
                    value = projects.find { it.id == selectedProjectId }?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Проект") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = projectExpanded) },
                    modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable)
                )
                ExposedDropdownMenu(
                    expanded = projectExpanded,
                    onDismissRequest = { projectExpanded = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Все") },
                        onClick = { onProjectSelected(null); projectExpanded = false }
                    )
                    projects.forEach { proj ->
                        DropdownMenuItem(
                            text = { Text(proj.name) },
                            onClick = { onProjectSelected(proj.id); projectExpanded = false }
                        )
                    }
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ExposedDropdownMenuBox(
                expanded = areaExpanded,
                onExpandedChange = { areaExpanded = it },
                modifier = Modifier.weight(1f)
            ) {
                OutlinedTextField(
                    value = areas.find { it.id == selectedAreaId }?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Область") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = areaExpanded) },
                    modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable)
                )
                ExposedDropdownMenu(
                    expanded = areaExpanded,
                    onDismissRequest = { areaExpanded = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Все") },
                        onClick = { onAreaSelected(null); areaExpanded = false }
                    )
                    areas.forEach { area ->
                        DropdownMenuItem(
                            text = { Text(area.name) },
                            onClick = { onAreaSelected(area.id); areaExpanded = false }
                        )
                    }
                }
            }

            ExposedDropdownMenuBox(
                expanded = sortExpanded,
                onExpandedChange = { sortExpanded = it },
                modifier = Modifier.weight(1f)
            ) {
                OutlinedTextField(
                    value = sortBy.label,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Сортировка") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = sortExpanded) },
                    modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable)
                )
                ExposedDropdownMenu(
                    expanded = sortExpanded,
                    onDismissRequest = { sortExpanded = false }
                ) {
                    SortOption.entries.forEach { opt ->
                        DropdownMenuItem(
                            text = { Text(opt.label) },
                            onClick = { onSortChanged(opt); sortExpanded = false }
                        )
                    }
                }
            }
        }

        ExposedDropdownMenuBox(
            expanded = groupExpanded,
            onExpandedChange = { groupExpanded = it }
        ) {
            OutlinedTextField(
                value = groupBy.label,
                onValueChange = {},
                readOnly = true,
                label = { Text("Группировка") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = groupExpanded) },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(MenuAnchorType.PrimaryNotEditable)
            )
            ExposedDropdownMenu(
                expanded = groupExpanded,
                onDismissRequest = { groupExpanded = false }
            ) {
                GroupOption.entries.forEach { opt ->
                    DropdownMenuItem(
                        text = { Text(opt.label) },
                        onClick = { onGroupChanged(opt); groupExpanded = false }
                    )
                }
            }
        }

        if (tags.isNotEmpty()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                tags.forEach { tag ->
                    FilterChip(
                        selected = tag.id in selectedTagIds,
                        onClick = {
                            if (tag.id in selectedTagIds) onTagDeselected(tag.id)
                            else onTagSelected(tag.id)
                        },
                        label = { Text(tag.name, style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }
        }
    }
}
