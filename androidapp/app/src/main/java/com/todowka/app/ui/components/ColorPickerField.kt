package com.todowka.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp

private val DefaultColors = listOf(
    Color(0xFFEF4444),
    Color(0xFFF97316),
    Color(0xFFF59E0B),
    Color(0xFF22C55E),
    Color(0xFF06B6D4),
    Color(0xFF3B82F6),
    Color(0xFF6366F1),
    Color(0xFF8B5CF6),
    Color(0xFFEC4899),
    Color(0xFF64748B)
)

@Composable
fun ColorPickerField(
    selectedColor: String?,
    onColorSelected: (String?) -> Unit,
    modifier: Modifier = Modifier,
    colors: List<Color> = DefaultColors,
    circleSize: Dp = 32.dp
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        colors.forEach { color ->
            val hex = "#${color.value.toString(16).takeLast(6).uppercase()}"
            val isSelected = selectedColor?.equals(hex, ignoreCase = true) == true

            Box(
                modifier = Modifier
                    .size(circleSize)
                    .clip(CircleShape)
                    .background(color)
                    .then(
                        if (isSelected) {
                            Modifier.border(
                                3.dp,
                                androidx.compose.material3.MaterialTheme.colorScheme.onSurface,
                                CircleShape
                            )
                        } else {
                            Modifier.border(
                                1.dp,
                                androidx.compose.material3.MaterialTheme.colorScheme.outline,
                                CircleShape
                            )
                        }
                    )
                    .clickable { onColorSelected(if (isSelected) null else hex) }
            )
        }
    }
}
