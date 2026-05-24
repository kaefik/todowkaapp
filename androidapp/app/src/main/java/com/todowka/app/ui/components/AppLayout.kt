package com.todowka.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.dp
import com.todowka.app.util.NetworkMonitor
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppLayout(
    currentRoute: String,
    sectionTitle: String,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    onSearchClick: () -> Unit,
    gtdCounts: Map<String, Int>,
    unreadNotifications: Int = 0,
    isSyncing: Boolean = false,
    syncError: Boolean = false,
    content: @Composable () -> Unit
) {
    val drawerState = rememberDrawerState(initialValue = androidx.compose.material3.DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
    val networkMonitor: NetworkMonitor = koinInject()
    val isOnline by networkMonitor.isOnline.collectAsState()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            Sidebar(
                currentRoute = currentRoute,
                onNavigate = { route ->
                    onNavigate(route)
                    scope.launch { drawerState.close() }
                },
                onLogout = {
                    onLogout()
                    scope.launch { drawerState.close() }
                },
                gtdCounts = gtdCounts
            )
        },
        gesturesEnabled = true
    ) {
        Scaffold(
            topBar = {
                Column {
                    TopAppBar(
                        title = { Text(text = sectionTitle) },
                        navigationIcon = {
                            IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                Icon(
                                    imageVector = Icons.Filled.Menu,
                                    contentDescription = "Меню"
                                )
                            }
                        },
                        actions = {
                            SyncStatus(
                                isSyncing = isSyncing,
                                hasError = syncError
                            )
                            NotificationBell(
                                unreadCount = unreadNotifications,
                                onClick = { onNavigate(com.todowka.app.ui.navigation.Route.Notifications.route) }
                            )
                            IconButton(onClick = onSearchClick) {
                                Icon(
                                    imageVector = Icons.Filled.Search,
                                    contentDescription = "Поиск"
                                )
                            }
                        },
                        scrollBehavior = scrollBehavior
                    )
                    OfflineBanner()
                }
            },
            modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                content()
            }
        }
    }
}
