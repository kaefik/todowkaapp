package com.todowka.app.ui.navigation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.AuthRepository
import com.todowka.app.domain.repository.TaskRepository
import com.todowka.app.ui.components.AuthInitializer
import com.todowka.app.ui.components.OfflineBanner
import com.todowka.app.ui.components.Sidebar
import com.todowka.app.ui.components.SyncStatus
import com.todowka.app.ui.screens.auth.LoginScreen
import com.todowka.app.ui.screens.auth.RegisterScreen
import com.todowka.app.ui.screens.onboarding.OnboardingScreen
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

private val ROUTE_TITLES = mapOf(
    Route.Tasks.route to "Все задачи",
    Route.Inbox.route to "Входящие",
    Route.Active.route to "Активные",
    Route.Today.route to "Сегодня",
    Route.Tomorrow.route to "Завтра",
    Route.NextActions.route to "Следующие действия",
    Route.WaitingFor.route to "Ожидание",
    Route.Someday.route to "Когда-нибудь",
    Route.Completed.route to "Выполненные",
    Route.Trash.route to "Корзина",
    Route.Projects.route to "Проекты",
    Route.Areas.route to "Области",
    Route.Contexts.route to "Контексты",
    Route.Tags.route to "Теги",
    Route.Calendar.route to "Календарь",
    Route.Events.route to "События",
    Route.Notifications.route to "Уведомления",
    Route.Profile.route to "Профиль",
    Route.Settings.route to "Настройки",
    Route.Review.route to "Обзор GTD",
)

private val ROUTES_WITH_BACK = setOf(
    Route.Profile.route,
    Route.Settings.route,
    Route.Calendar.route,
    Route.Notifications.route,
    Route.ProjectDetail.route,
    Route.AreaDetail.route,
)

private val AUTH_ROUTES = setOf(
    Route.Login.route,
    Route.Register.route,
    Route.Onboarding.route,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavGraph() {
    val navController = rememberNavController()
    val authRepository: AuthRepository = koinInject()
    val authPreferences: AuthPreferences = koinInject()
    val taskRepository: TaskRepository = koinInject()
    val isLoggedIn by authRepository.isLoggedIn.collectAsState()
    val isGuestMode by authRepository.isGuestMode.collectAsState()

    val drawerState = rememberDrawerState(androidx.compose.material3.DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: ""
    val isAuthScreen = currentRoute in AUTH_ROUTES
    val showBack = currentRoute in ROUTES_WITH_BACK
    val sectionTitle = ROUTE_TITLES[currentRoute] ?: ""

    val userId = authPreferences.currentUserId
    val gtdCounts by if (userId != null) {
        taskRepository.getCounts(userId).collectAsState(initial = emptyMap())
    } else {
        MutableStateFlow(emptyMap<String, Int>()).collectAsState()
    }

    AuthInitializer()

    val startDestination = if (isLoggedIn) Route.Tasks.route else Route.Login.route

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            if (!isAuthScreen) {
                Sidebar(
                    currentRoute = currentRoute,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(Route.Tasks.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                        scope.launch { drawerState.close() }
                    },
                    onLogout = {
                        scope.launch { drawerState.close() }
                    },
                    gtdCounts = gtdCounts
                )
            }
        },
        gesturesEnabled = !isAuthScreen && !showBack
    ) {
        Scaffold(
            topBar = {
                if (!isAuthScreen) {
                    Column {
                        TopAppBar(
                            title = { Text(text = sectionTitle) },
                            navigationIcon = {
                                if (showBack) {
                                    IconButton(onClick = { navController.popBackStack() }) {
                                        Icon(
                                            Icons.AutoMirrored.Filled.ArrowBack,
                                            contentDescription = "Назад"
                                        )
                                    }
                                } else {
                                    IconButton(
                                        onClick = { scope.launch { drawerState.open() } }
                                    ) {
                                        Icon(
                                            Icons.Filled.Menu,
                                            contentDescription = "Меню"
                                        )
                                    }
                                }
                            },
                            actions = {
                                if (!isGuestMode) {
                                    SyncStatus(isSyncing = false, hasError = false)
                                }
                                if (currentRoute == Route.Tasks.route) {
                                    IconButton(onClick = { }) {
                                        Icon(
                                            Icons.Filled.Search,
                                            contentDescription = "Поиск"
                                        )
                                    }
                                }
                            },
                            scrollBehavior = scrollBehavior
                        )
                        OfflineBanner()
                    }
                }
            },
            modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
        ) { paddingValues ->
            NavHost(
                navController = navController,
                startDestination = startDestination,
                modifier = Modifier.padding(paddingValues)
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
                        onNavigateBack = { navController.popBackStack() },
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
                    isGuestMode = isGuestMode,
                    onLogout = {
                        navController.navigate(Route.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onNavigateToLogin = {
                        navController.navigate(Route.Login.route) {
                            popUpTo(Route.Profile.route) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
