package com.todowka.app.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.NavHostController
import com.todowka.app.domain.repository.AuthRepository
import com.todowka.app.ui.navigation.Route
import org.koin.compose.koinInject

@Composable
fun ProtectedRoute(
    navController: NavHostController,
    content: @Composable () -> Unit
) {
    val authRepository: AuthRepository = koinInject()
    val isLoggedIn by authRepository.isLoggedIn.collectAsState()

    LaunchedEffect(isLoggedIn) {
        if (!isLoggedIn) {
            navController.navigate(Route.Login.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    if (isLoggedIn) {
        content()
    }
}
