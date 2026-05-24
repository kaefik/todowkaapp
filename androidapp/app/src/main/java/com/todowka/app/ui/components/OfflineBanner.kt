package com.todowka.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.todowka.app.ui.theme.Red500
import com.todowka.app.util.NetworkMonitor
import org.koin.compose.koinInject

@Composable
fun OfflineBanner(
    modifier: Modifier = Modifier
) {
    val networkMonitor: NetworkMonitor = koinInject()
    val isOnline by networkMonitor.isOnline.collectAsState()

    AnimatedVisibility(
        visible = !isOnline,
        enter = slideInVertically(),
        exit = slideOutVertically(),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Red500.copy(alpha = 0.9f))
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            StatusLight(
                state = StatusLightState.OFFLINE,
                size = 8.dp
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Нет подключения к интернету",
                color = androidx.compose.ui.graphics.Color.White,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
