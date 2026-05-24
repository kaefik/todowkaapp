package com.todowka.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.todowka.app.ui.theme.Green500
import com.todowka.app.ui.theme.Orange500
import com.todowka.app.ui.theme.Red500

enum class StatusLightState { ONLINE, OFFLINE, SYNCING }

@Composable
fun StatusLight(
    state: StatusLightState,
    modifier: Modifier = Modifier,
    size: Dp = 8.dp
) {
    val color = when (state) {
        StatusLightState.ONLINE -> Green500
        StatusLightState.OFFLINE -> Red500
        StatusLightState.SYNCING -> Orange500
    }

    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(color)
            .border(1.dp, Color.White.copy(alpha = 0.3f), CircleShape)
    )
}
