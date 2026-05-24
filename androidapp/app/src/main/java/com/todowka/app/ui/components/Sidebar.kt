package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Label
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.RateReview
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Tag
import androidx.compose.material.icons.filled.Today
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.todowka.app.ui.navigation.Route

data class SidebarItem(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val badge: Int? = null
)

@Composable
fun Sidebar(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    gtdCounts: Map<String, Int>,
    modifier: Modifier = Modifier
) {
    ModalDrawerSheet(modifier = modifier) {
        Text(
            text = "Todowka",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 28.dp, vertical = 16.dp)
        )

        val gtdItems = listOf(
            SidebarItem(Route.Inbox.route, "Входящие", Icons.Filled.Inbox, gtdCounts["inbox"]),
            SidebarItem(Route.Active.route, "Активные", Icons.Filled.PlayArrow, gtdCounts["active"]),
            SidebarItem(Route.Today.route, "Сегодня", Icons.Filled.Today, gtdCounts["today"]),
            SidebarItem(Route.Tomorrow.route, "Завтра", Icons.Filled.Event, gtdCounts["tomorrow"]),
            SidebarItem(Route.NextActions.route, "Следующие", Icons.Filled.ArrowForward, gtdCounts["next"]),
            SidebarItem(Route.WaitingFor.route, "Ожидание", Icons.Filled.Pause, gtdCounts["waiting"]),
            SidebarItem(Route.Someday.route, "Когда-нибудь", Icons.Filled.Schedule, gtdCounts["someday"]),
        )

        SidebarSection(title = "GTD") {
            gtdItems.forEach { item ->
                NavigationDrawerItem(
                    icon = {
                        SidebarIcon(icon = item.icon, badge = item.badge)
                    },
                    label = { Text(item.label) },
                    selected = currentRoute == item.route,
                    onClick = { onNavigate(item.route) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )
            }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

        val viewItems = listOf(
            SidebarItem(Route.Calendar.route, "Календарь", Icons.Filled.CalendarMonth),
            SidebarItem(Route.Projects.route, "Проекты", Icons.Filled.Folder),
            SidebarItem(Route.Areas.route, "Области", Icons.Filled.Dashboard),
            SidebarItem(Route.Contexts.route, "Контексты", Icons.Filled.Label),
            SidebarItem(Route.Tags.route, "Теги", Icons.Filled.Tag),
        )

        SidebarSection(title = "Представления") {
            viewItems.forEach { item ->
                NavigationDrawerItem(
                    icon = { Icon(item.icon, contentDescription = item.label, modifier = Modifier.size(24.dp)) },
                    label = { Text(item.label) },
                    selected = currentRoute == item.route,
                    onClick = { onNavigate(item.route) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )
            }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

        val manageItems = listOf(
            SidebarItem(Route.Completed.route, "Завершено", Icons.Filled.CheckCircle, gtdCounts["completed"]),
            SidebarItem(Route.Trash.route, "Корзина", Icons.Filled.Delete, gtdCounts["trash"]),
        )

        SidebarSection(title = "Управление") {
            manageItems.forEach { item ->
                NavigationDrawerItem(
                    icon = {
                        SidebarIcon(icon = item.icon, badge = item.badge)
                    },
                    label = { Text(item.label) },
                    selected = currentRoute == item.route,
                    onClick = { onNavigate(item.route) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )
            }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

        Spacer(modifier = Modifier.height(8.dp))

        NavigationDrawerItem(
            icon = { Icon(Icons.Filled.Notifications, contentDescription = "Уведомления", modifier = Modifier.size(24.dp)) },
            label = { Text("Уведомления") },
            selected = currentRoute == Route.Notifications.route,
            onClick = { onNavigate(Route.Notifications.route) },
            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
        )

        NavigationDrawerItem(
            icon = { Icon(Icons.Filled.Person, contentDescription = "Профиль", modifier = Modifier.size(24.dp)) },
            label = { Text("Профиль") },
            selected = currentRoute == Route.Profile.route,
            onClick = { onNavigate(Route.Profile.route) },
            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
        )

        NavigationDrawerItem(
            icon = { Icon(Icons.Filled.Settings, contentDescription = "Настройки", modifier = Modifier.size(24.dp)) },
            label = { Text("Настройки") },
            selected = currentRoute == Route.Settings.route,
            onClick = { onNavigate(Route.Settings.route) },
            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
        )

        NavigationDrawerItem(
            icon = { Icon(Icons.Filled.RateReview, contentDescription = "Обзор", modifier = Modifier.size(24.dp)) },
            label = { Text("Обзор GTD") },
            selected = currentRoute == Route.Review.route,
            onClick = { onNavigate(Route.Review.route) },
            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

        NavigationDrawerItem(
            icon = {
                Icon(
                    Icons.Filled.Logout,
                    contentDescription = "Выход",
                    modifier = Modifier.size(24.dp),
                    tint = MaterialTheme.colorScheme.error
                )
            },
            label = { Text("Выход", color = MaterialTheme.colorScheme.error) },
            selected = false,
            onClick = onLogout,
            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
        )

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun SidebarIcon(icon: ImageVector, badge: Int?) {
    BadgedBox(
        badge = {
            if (badge != null && badge > 0) {
                Badge { Text(badge.toString()) }
            }
        }
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(24.dp))
    }
}
