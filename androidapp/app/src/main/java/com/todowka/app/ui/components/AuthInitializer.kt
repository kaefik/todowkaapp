package com.todowka.app.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.todowka.app.domain.repository.AuthRepository
import org.koin.compose.koinInject

@Composable
fun AuthInitializer() {
    val authRepository: AuthRepository = koinInject()

    LaunchedEffect(Unit) {
        if (authRepository.isLoggedIn.value && !authRepository.isGuestMode.value) {
            authRepository.getCurrentUser()
        }
    }
}
