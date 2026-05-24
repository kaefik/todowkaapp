package com.todowka.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class ToastType { SUCCESS, ERROR, INFO, WARNING }

data class ToastMessage(
    val text: String,
    val type: ToastType = ToastType.INFO,
    val durationMs: Long = 3000L
)

class ToastState {
    private val _current = MutableStateFlow<ToastMessage?>(null)
    val current = _current.asStateFlow()

    suspend fun show(message: ToastMessage) {
        _current.value = message
        delay(message.durationMs)
        _current.value = null
    }

    fun dismiss() {
        _current.value = null
    }
}

private val ToastType.backgroundColor: Color
    get() = when (this) {
        ToastType.SUCCESS -> Color(0xFF22C55E)
        ToastType.ERROR -> Color(0xFFEF4444)
        ToastType.INFO -> Color(0xFF3B82F6)
        ToastType.WARNING -> Color(0xFFF97316)
    }

private val ToastType.icon: androidx.compose.ui.graphics.vector.ImageVector
    get() = when (this) {
        ToastType.SUCCESS -> Icons.Filled.CheckCircle
        ToastType.ERROR -> Icons.Filled.Error
        ToastType.INFO -> Icons.Filled.Info
        ToastType.WARNING -> Icons.Filled.Warning
    }

@Composable
fun ToastContainer(
    state: ToastState,
    modifier: Modifier = Modifier
) {
    val toast by state.current.collectAsState()

    AnimatedVisibility(
        visible = toast != null,
        enter = fadeIn() + slideInVertically(initialOffsetY = { -it }),
        exit = fadeOut() + slideOutVertically(targetOffsetY = { -it }),
        modifier = modifier
    ) {
        toast?.let { msg ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(msg.type.backgroundColor)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = msg.type.icon,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = msg.text,
                    color = Color.White,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}
