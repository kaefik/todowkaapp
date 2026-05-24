package com.todowka.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.todowka.app.ui.screens.auth.LoginScreen
import com.todowka.app.ui.screens.auth.RegisterScreen

fun NavGraphBuilder.authNavGraph(
    onNavigateToRegister: () -> Unit,
    onLoginSuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    onRegisterSuccess: () -> Unit
) {
    composable(Route.Login.route) {
        LoginScreen(
            onNavigateToRegister = onNavigateToRegister,
            onLoginSuccess = onLoginSuccess
        )
    }

    composable(Route.Register.route) {
        RegisterScreen(
            onNavigateBack = onNavigateBack,
            onRegisterSuccess = onRegisterSuccess
        )
    }
}
