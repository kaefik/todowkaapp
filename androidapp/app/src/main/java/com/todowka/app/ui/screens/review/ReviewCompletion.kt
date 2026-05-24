package com.todowka.app.ui.screens.review

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun ReviewCompletion(
    processedCount: Int,
    activatedCount: Int,
    completedCount: Int,
    isCompleting: Boolean,
    reviewFrequencyDays: Int,
    onComplete: () -> Unit
) {
    val nextReviewDate = LocalDate.now().plusDays(reviewFrequencyDays.toLong())
        .format(DateTimeFormatter.ofPattern("d MMMM yyyy"))

    Column(
        modifier = Modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Обзор завершен!",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            CompletionStat("Обработано", processedCount)
            CompletionStat("Активировано", activatedCount)
            CompletionStat("Завершено", completedCount)
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Следующий обзор: $nextReviewDate",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onComplete,
            enabled = !isCompleting,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isCompleting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp).padding(end = 8.dp),
                    color = MaterialTheme.colorScheme.onPrimary,
                    strokeWidth = 2.dp
                )
            }
            Text("Завершить обзор")
        }
    }
}

@Composable
private fun CompletionStat(label: String, count: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
