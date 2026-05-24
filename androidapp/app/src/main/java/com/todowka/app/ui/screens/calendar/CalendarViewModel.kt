package com.todowka.app.ui.screens.calendar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.CalendarEventEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.CalendarEventRepository
import com.todowka.app.domain.repository.TaskRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import java.time.LocalDate

enum class CalendarViewMode { DAY, WEEK, MONTH, YEAR }

data class CalendarState(
    val currentDate: LocalDate = LocalDate.now(),
    val viewMode: CalendarViewMode = CalendarViewMode.MONTH,
    val events: List<CalendarEventEntity> = emptyList(),
    val tasks: List<TaskEntity> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

class CalendarViewModel(
    private val calendarEventRepository: CalendarEventRepository,
    private val taskRepository: TaskRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(CalendarState())
    val state: StateFlow<CalendarState> = _state.asStateFlow()

    init {
        loadVisibleRange()
    }

    private fun loadVisibleRange() {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            try {
                val start = startOfRange(_state.value.currentDate, _state.value.viewMode)
                val end = endOfRange(_state.value.currentDate, _state.value.viewMode)
                combine(
                    calendarEventRepository.getByDateRange(userId, start.toString(), end.toString()),
                    taskRepository.getDueTasks(userId, start.toString())
                ) { events, tasks ->
                    _state.value.copy(events = events, tasks = tasks, isLoading = false, error = null)
                }.collect { newState ->
                    _state.value = newState
                }
            } catch (e: Exception) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun selectDate(date: LocalDate) {
        _state.value = _state.value.copy(currentDate = date)
        loadVisibleRange()
    }

    fun prev() {
        val current = _state.value.currentDate
        _state.value = _state.value.copy(
            currentDate = when (_state.value.viewMode) {
                CalendarViewMode.DAY -> current.minusDays(1)
                CalendarViewMode.WEEK -> current.minusWeeks(1)
                CalendarViewMode.MONTH -> current.minusMonths(1)
                CalendarViewMode.YEAR -> current.minusYears(1)
            }
        )
        loadVisibleRange()
    }

    fun next() {
        val current = _state.value.currentDate
        _state.value = _state.value.copy(
            currentDate = when (_state.value.viewMode) {
                CalendarViewMode.DAY -> current.plusDays(1)
                CalendarViewMode.WEEK -> current.plusWeeks(1)
                CalendarViewMode.MONTH -> current.plusMonths(1)
                CalendarViewMode.YEAR -> current.plusYears(1)
            }
        )
        loadVisibleRange()
    }

    fun today() {
        _state.value = _state.value.copy(currentDate = LocalDate.now())
        loadVisibleRange()
    }

    fun changeViewMode(mode: CalendarViewMode) {
        _state.value = _state.value.copy(viewMode = mode)
        loadVisibleRange()
    }

    private fun startOfRange(date: LocalDate, mode: CalendarViewMode): LocalDate = when (mode) {
        CalendarViewMode.DAY -> date
        CalendarViewMode.WEEK -> date.minusDays(date.dayOfWeek.value.toLong() - 1)
        CalendarViewMode.MONTH -> date.withDayOfMonth(1)
        CalendarViewMode.YEAR -> date.withDayOfYear(1)
    }

    private fun endOfRange(date: LocalDate, mode: CalendarViewMode): LocalDate = when (mode) {
        CalendarViewMode.DAY -> date.plusDays(1)
        CalendarViewMode.WEEK -> date.plusDays(7 - date.dayOfWeek.value.toLong())
        CalendarViewMode.MONTH -> date.withDayOfMonth(date.lengthOfMonth())
        CalendarViewMode.YEAR -> date.withDayOfYear(date.lengthOfYear())
    }
}
