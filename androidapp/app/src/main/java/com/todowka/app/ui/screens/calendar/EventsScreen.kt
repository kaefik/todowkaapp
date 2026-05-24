package com.todowka.app.ui.screens.calendar

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.CalendarEventEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.CalendarEventRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

data class EventsState(
    val events: List<CalendarEventEntity> = emptyList(),
    val isLoading: Boolean = true
)

class EventsViewModel(
    private val calendarEventRepository: CalendarEventRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(EventsState())
    val state: StateFlow<EventsState> = _state.asStateFlow()

    init {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            calendarEventRepository.getAll(userId).collect { events ->
                _state.value = _state.value.copy(events = events, isLoading = false)
            }
        }
    }

    fun deleteEvent(eventId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch { calendarEventRepository.deleteEvent(eventId, userId) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventsScreen(
    onAddEvent: () -> Unit = {},
    viewModel: EventsViewModel = koinInject()
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("События") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddEvent) {
                Icon(Icons.Default.Add, contentDescription = "Добавить событие")
            }
        }
    ) { padding ->
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(vertical = 8.dp, horizontal = 16.dp)
            ) {
                items(state.events, key = { it.id }) { event ->
                    Card(
                        modifier = Modifier.padding(vertical = 4.dp)
                    ) {
                        ListItem(
                            headlineContent = { Text(event.title) },
                            supportingContent = {
                                Text(
                                    "${event.startTime}${if (event.endTime != null) " — ${event.endTime}" else ""}${if (event.allDay) " (весь день)" else ""}",
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        )
                    }
                }
            }
        }
    }
}
