package com.todowka.app.ui.screens.review

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.todowka.app.data.remote.dto.response.ReviewSummaryResponse

@Composable
fun ReviewDashboard(
    summary: ReviewSummaryResponse?,
    onStartReview: () -> Unit
) {
    if (summary == null) {
        Box(
            modifier = Modifier.fillMaxWidth().padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
        return
    }

    val healthScore = when (summary.healthStatus) {
        "healthy" -> 100
        "warning" -> 60
        "critical" -> 30
        else -> 50
    }

    LazyColumn(modifier = Modifier.padding(16.dp)) {
        item {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(
                        progress = { healthScore / 100f },
                        modifier = Modifier.size(120.dp),
                        color = when (summary.healthStatus) {
                            "healthy" -> MaterialTheme.colorScheme.primary
                            "warning" -> MaterialTheme.colorScheme.tertiary
                            "critical" -> MaterialTheme.colorScheme.error
                            else -> MaterialTheme.colorScheme.outline
                        },
                        strokeWidth = 8.dp
                    )
                    Text(
                        text = "$healthScore%",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = when (summary.healthStatus) {
                        "healthy" -> "Всё в порядке"
                        "warning" -> "Требует внимания"
                        "critical" -> "Требует срочного обзора"
                        else -> "Неизвестно"
                    },
                    style = MaterialTheme.typography.titleMedium
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCard("Входящие", summary.inboxCount, Modifier.weight(1f))
                StatCard("Просроченные", summary.overdueCount, Modifier.weight(1f))
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCard("Без действия", summary.projectsWithoutNext, Modifier.weight(1f))
                StatCard("Когда-нибудь", summary.somedayCount, Modifier.weight(1f))
            }
        }

        item {
            if (summary.lastReviewDate != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Последний обзор: ${summary.lastReviewDate}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = onStartReview,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Начать обзор")
            }
        }
    }
}

@Composable
private fun StatCard(label: String, count: Int, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = count.toString(),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = if (count > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
            )
            Text(text = label, style = MaterialTheme.typography.bodySmall)
        }
    }
}
