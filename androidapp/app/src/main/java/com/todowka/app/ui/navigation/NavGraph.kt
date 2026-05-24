package com.todowka.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.todowka.app.ui.components.AuthInitializer
import com.todowka.app.ui.screens.auth.LoginScreen
import com.todowka.app.ui.screens.auth.RegisterScreen
import com.todowka.app.ui.screens.onboarding.OnboardingScreen
import org.koin.compose.koinInject
import com.todowka.app.domain.repository.AuthRepository

@Composable
fun NavGraph() {
    val navController = rememberNavController()
    val authRepository: AuthRepository = koinInject()
    val isLoggedIn by authRepository.isLoggedIn.collectAsState()

    AuthInitializer()

    val startDestination = if (isLoggedIn) Route.Tasks.route else Route.Login.route

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Route.Login.route) {
            LoginScreen(
                onNavigateToRegister = {
                    navController.navigate(Route.Register.route)
                },
                onLoginSuccess = {
                    navController.navigate(Route.Tasks.route) {
                        popUpTo(Route.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Route.Register.route) {
            RegisterScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onRegisterSuccess = {
                    navController.navigate(Route.Login.route) {
                        popUpTo(Route.Register.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Route.Onboarding.route) {
            OnboardingScreen(
                onComplete = {
                    navController.navigate(Route.Tasks.route) {
                        popUpTo(Route.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }

        mainNavGraph(
            navController = navController,
            isLoggedIn = isLoggedIn,
            onLogout = {
                navController.navigate(Route.Login.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
        )
    }
}
