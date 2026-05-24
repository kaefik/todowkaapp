package com.todowka.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = Indigo500,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    primaryContainer = Indigo200,
    onPrimaryContainer = Indigo900,
    secondary = Blue500,
    onSecondary = androidx.compose.ui.graphics.Color.White,
    secondaryContainer = Blue200,
    onSecondaryContainer = Gray900,
    tertiary = Green500,
    background = Gray50,
    onBackground = Gray900,
    surface = androidx.compose.ui.graphics.Color.White,
    onSurface = Gray900,
    surfaceVariant = Gray100,
    onSurfaceVariant = Gray700,
    outline = Gray300,
    outlineVariant = Gray200,
    error = Red500,
    onError = androidx.compose.ui.graphics.Color.White
)

private val DarkColorScheme = darkColorScheme(
    primary = Indigo200,
    onPrimary = Indigo900,
    primaryContainer = Indigo700,
    onPrimaryContainer = Indigo200,
    secondary = Blue200,
    onSecondary = Gray900,
    secondaryContainer = Blue500,
    onSecondaryContainer = Gray50,
    tertiary = Green500,
    background = Gray900,
    onBackground = Gray50,
    surface = Gray800,
    onSurface = Gray50,
    surfaceVariant = Gray700,
    onSurfaceVariant = Gray300,
    outline = Gray600,
    outlineVariant = Gray700,
    error = Red500,
    onError = androidx.compose.ui.graphics.Color.White
)

@Composable
fun TodowkaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}
