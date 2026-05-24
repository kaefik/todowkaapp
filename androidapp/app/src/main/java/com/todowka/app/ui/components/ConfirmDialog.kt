package com.todowka.app.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable

@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmText: String = "Подтвердить",
    cancelText: String = "Отмена",
    confirmButtonColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.error,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = title) },
        text = { Text(text = message) },
        confirmButton = {
            FilledTonalButton(
                onClick = onConfirm,
                colors = androidx.compose.material3.ButtonDefaults.filledTonalButtonColors(
                    containerColor = confirmButtonColor,
                    contentColor = MaterialTheme.colorScheme.onError
                )
            ) {
                Text(text = confirmText)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(text = cancelText)
            }
        }
    )
}
