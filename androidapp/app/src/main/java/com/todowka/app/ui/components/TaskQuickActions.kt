package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Label
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.util.GtdStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskQuickActions(
    onMoveToStatus: (String) -> Unit,
    onSetProject: () -> Unit,
    onSetContext: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    var statusExpanded by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        ExposedDropdownMenuBox(
            expanded = statusExpanded,
            onExpandedChange = { statusExpanded = it }
        ) {
            IconButton(
                onClick = { statusExpanded = true },
                modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable)
            ) {
                Icon(
                    imageVector = Icons.Filled.PlayArrow,
                    contentDescription = "Переместить",
                    modifier = Modifier.size(20.dp)
                )
            }
            ExposedDropdownMenu(
                expanded = statusExpanded,
                onDismissRequest = { statusExpanded = false }
            ) {
                GtdStatus.entries
                    .filter { it != GtdStatus.TRASH }
                    .forEach { status ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = when (status) {
                                        GtdStatus.INBOX -> "Входящие"
                                        GtdStatus.ACTIVE -> "Активные"
                                        GtdStatus.NEXT -> "Следующие"
                                        GtdStatus.WAITING -> "Ожидание"
                                        GtdStatus.SOMEDAY -> "Когда-нибудь"
                                        GtdStatus.COMPLETED -> "Завершено"
                                        GtdStatus.TRASH -> "Корзина"
                                    }
                                )
                            },
                            onClick = {
                                onMoveToStatus(status.value)
                                statusExpanded = false
                            }
                        )
                    }
            }
        }

        IconButton(onClick = onSetProject) {
            Icon(
                imageVector = Icons.Filled.Folder,
                contentDescription = "Проект",
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        IconButton(onClick = onSetContext) {
            Icon(
                imageVector = Icons.Filled.Label,
                contentDescription = "Контекст",
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        IconButton(onClick = onEdit) {
            Icon(
                imageVector = Icons.Filled.Edit,
                contentDescription = "Редактировать",
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        IconButton(onClick = onDelete) {
            Icon(
                imageVector = Icons.Filled.Delete,
                contentDescription = "Удалить",
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.error
            )
        }
    }
}
