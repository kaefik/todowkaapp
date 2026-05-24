package com.todowka.app.ui.navigation

sealed class Route(val route: String) {
    data object Login : Route("login")
    data object Register : Route("register")
    data object Onboarding : Route("onboarding")

    data object Tasks : Route("tasks")
    data object Inbox : Route("inbox")
    data object Active : Route("active")
    data object Today : Route("today")
    data object Tomorrow : Route("tomorrow")
    data object NextActions : Route("next")
    data object WaitingFor : Route("waiting")
    data object Someday : Route("someday")
    data object Completed : Route("completed")
    data object Trash : Route("trash")

    data object Projects : Route("projects")
    data object ProjectDetail : Route("projects/{projectId}")
    data object ProjectsNoProject : Route("projects/no-project")

    data object Areas : Route("areas")
    data object AreaDetail : Route("areas/{areaId}")

    data object Contexts : Route("contexts")
    data object Tags : Route("tags")

    data object Calendar : Route("calendar")
    data object Events : Route("events")

    data object Notifications : Route("notifications")
    data object Profile : Route("profile")
    data object Settings : Route("settings")

    data object Review : Route("review")
    data object ReviewDashboard : Route("review/dashboard")
    data object ReviewOverdue : Route("review/overdue")
    data object ReviewInbox : Route("review/inbox")
    data object ReviewProjects : Route("review/projects")
    data object ReviewSomeday : Route("review/someday")
    data object ReviewCompletion : Route("review/completion")
}
