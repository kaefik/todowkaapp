package com.todowka.app.ui.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.todowka.app.ui.screens.areas.AreaDetailScreen
import com.todowka.app.ui.screens.areas.AreasScreen
import com.todowka.app.ui.screens.calendar.CalendarScreen
import com.todowka.app.ui.screens.calendar.EventsScreen
import com.todowka.app.ui.screens.contexts.ContextsScreen
import com.todowka.app.ui.screens.onboarding.OnboardingScreen
import com.todowka.app.ui.screens.profile.ProfileScreen
import com.todowka.app.ui.screens.projects.ProjectDetailScreen
import com.todowka.app.ui.screens.projects.ProjectsScreen
import com.todowka.app.ui.screens.review.ReviewScreen
import com.todowka.app.ui.screens.settings.SettingsScreen
import com.todowka.app.ui.screens.tags.TagsScreen
import com.todowka.app.ui.screens.tasks.ActiveScreen
import com.todowka.app.ui.screens.tasks.CompletedScreen
import com.todowka.app.ui.screens.tasks.InboxScreen
import com.todowka.app.ui.screens.tasks.NextActionsScreen
import com.todowka.app.ui.screens.tasks.SomedayScreen
import com.todowka.app.ui.screens.tasks.TodayScreen
import com.todowka.app.ui.screens.tasks.TomorrowScreen
import com.todowka.app.ui.screens.tasks.TrashScreen
import com.todowka.app.ui.screens.tasks.TasksScreen
import com.todowka.app.ui.screens.tasks.WaitingForScreen

fun NavGraphBuilder.mainNavGraph(
    navController: NavHostController,
    isLoggedIn: Boolean,
    onLogout: () -> Unit
) {
    composable(Route.Tasks.route) {
        TasksScreen()
    }
    composable(Route.Inbox.route) {
        InboxScreen()
    }
    composable(Route.Active.route) {
        ActiveScreen()
    }
    composable(Route.Today.route) {
        TodayScreen()
    }
    composable(Route.Tomorrow.route) {
        TomorrowScreen()
    }
    composable(Route.NextActions.route) {
        NextActionsScreen()
    }
    composable(Route.WaitingFor.route) {
        WaitingForScreen()
    }
    composable(Route.Someday.route) {
        SomedayScreen()
    }
    composable(Route.Completed.route) {
        CompletedScreen()
    }
    composable(Route.Trash.route) {
        TrashScreen()
    }
    composable(Route.Projects.route) {
        ProjectsScreen(
            onProjectClick = { projectId ->
                navController.navigate("projects/$projectId")
            }
        )
    }
    composable(
        Route.ProjectDetail.route,
        arguments = listOf(navArgument("projectId") { defaultValue = "" })
    ) { backStackEntry ->
        val projectId = backStackEntry.arguments?.getString("projectId") ?: ""
        ProjectDetailScreen(
            projectId = projectId,
            onBack = { navController.popBackStack() }
        )
    }
    composable(Route.Areas.route) {
        AreasScreen(
            onAreaClick = { areaId ->
                navController.navigate("areas/$areaId")
            }
        )
    }
    composable(
        Route.AreaDetail.route,
        arguments = listOf(navArgument("areaId") { defaultValue = "" })
    ) { backStackEntry ->
        val areaId = backStackEntry.arguments?.getString("areaId") ?: ""
        AreaDetailScreen(
            areaId = areaId,
            onBack = { navController.popBackStack() }
        )
    }
    composable(Route.Contexts.route) {
        ContextsScreen()
    }
    composable(Route.Tags.route) {
        TagsScreen()
    }
    composable(Route.Calendar.route) {
        CalendarScreen()
    }
    composable(Route.Events.route) {
        EventsScreen()
    }
    composable(Route.Notifications.route) {
        com.todowka.app.ui.screens.notifications.NotificationsScreen()
    }
    composable(Route.Profile.route) {
        ProfileScreen(
            onLogout = onLogout,
            onBack = { navController.popBackStack() }
        )
    }
    composable(Route.Settings.route) {
        SettingsScreen(
            onBack = { navController.popBackStack() }
        )
    }
    composable(Route.Review.route) {
        ReviewScreen(
            onBack = { navController.popBackStack() },
            onComplete = { navController.popBackStack() }
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
    composable(Route.ReviewDashboard.route) {
        ReviewScreen(onBack = { navController.popBackStack() })
    }
    composable(Route.ReviewOverdue.route) {
        ReviewScreen(onBack = { navController.popBackStack() })
    }
    composable(Route.ReviewInbox.route) {
        ReviewScreen(onBack = { navController.popBackStack() })
    }
    composable(Route.ReviewProjects.route) {
        ReviewScreen(onBack = { navController.popBackStack() })
    }
    composable(Route.ReviewSomeday.route) {
        ReviewScreen(onBack = { navController.popBackStack() })
    }
    composable(Route.ReviewCompletion.route) {
        ReviewScreen(
            onBack = { navController.popBackStack() },
            onComplete = { navController.popBackStack() }
        )
    }
}
