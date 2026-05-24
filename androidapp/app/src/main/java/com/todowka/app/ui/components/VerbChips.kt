package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.data.local.db.entity.VerbTemplateEntity
import com.todowka.app.domain.repository.VerbTemplateRepository
import org.koin.compose.koinInject

@Composable
fun VerbChips(
    userId: String,
    onVerbSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val verbRepo: VerbTemplateRepository = koinInject()
    val verbs by verbRepo.getAll(userId).collectAsState(initial = emptyList())

    if (verbs.isNotEmpty()) {
        LazyRow(
            modifier = modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(verbs, key = { it.id }) { verb ->
                AssistChip(
                    onClick = { onVerbSelected(verb.text) },
                    label = { Text(text = verb.text, style = MaterialTheme.typography.labelMedium) },
                    leadingIcon = {
                        verb.icon?.let {
                            Icon(
                                imageVector = when (it) {
                                    "call" -> Icons.Filled.Phone
                                    "email" -> Icons.Filled.Email
                                    "buy" -> Icons.Filled.ShoppingCart
                                    "read" -> Icons.Filled.MenuBook
                                    "write" -> Icons.Filled.Edit
                                    else -> Icons.Filled.PlayArrow
                                },
                                contentDescription = null,
                                modifier = Modifier.size(AssistChipDefaults.IconSize)
                            )
                        }
                    }
                )
            }
        }
    }
}
