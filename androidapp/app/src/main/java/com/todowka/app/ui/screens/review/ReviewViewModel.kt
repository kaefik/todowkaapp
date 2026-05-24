package com.todowka.app.ui.screens.review

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.data.remote.dto.response.OverdueTaskItemResponse
import com.todowka.app.data.remote.dto.response.ProjectReviewItemResponse
import com.todowka.app.data.remote.dto.response.ReviewStatusResponse
import com.todowka.app.data.remote.dto.response.ReviewSummaryResponse
import com.todowka.app.data.remote.dto.response.TaskReviewItemResponse
import com.todowka.app.domain.repository.ReviewRepository
import com.todowka.app.domain.repository.TaskRepository
import com.todowka.app.domain.repository.ProjectRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class StepStats(
    val processed: Int = 0,
    val activated: Int = 0,
    val completed: Int = 0
)

data class ReviewDataState(
    val currentStep: Int = 0,
    val summary: ReviewSummaryResponse? = null,
    val overdueTasks: List<OverdueTaskItemResponse> = emptyList(),
    val inboxTasks: List<TaskReviewItemResponse> = emptyList(),
    val projects: List<ProjectReviewItemResponse> = emptyList(),
    val somedayTasks: List<TaskReviewItemResponse> = emptyList(),
    val stepStats: StepStats = StepStats(),
    val isLoading: Boolean = true,
    val isCompleting: Boolean = false,
    val error: String? = null
)

class ReviewViewModel(
    private val reviewRepository: ReviewRepository,
    private val taskRepository: TaskRepository,
    private val projectRepository: ProjectRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(ReviewDataState())
    val state: StateFlow<ReviewDataState> = _state.asStateFlow()

    init {
        loadSummary()
    }

    private fun loadSummary() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val summaryResult = reviewRepository.getSummary()
            val statusResult = reviewRepository.getStatus()
            if (summaryResult.isSuccess && statusResult.isSuccess) {
                val status = statusResult.getOrNull()!!
                _state.value = _state.value.copy(
                    summary = summaryResult.getOrNull(),
                    overdueTasks = status.overdueTasks,
                    inboxTasks = status.inboxTasks,
                    projects = status.activeProjects,
                    somedayTasks = status.somedayTasks,
                    isLoading = false,
                    error = null
                )
            } else {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = summaryResult.exceptionOrNull()?.message ?: statusResult.exceptionOrNull()?.message
                )
            }
        }
    }

    fun goToStep(step: Int) {
        _state.value = _state.value.copy(currentStep = step.coerceIn(0, 5))
    }

    fun processTask(taskId: String, action: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            when (action) {
                "today", "active", "next" -> {
                    taskRepository.moveTask(taskId, userId, action)
                    val stats = _state.value.stepStats
                    _state.value = _state.value.copy(
                        stepStats = stats.copy(processed = stats.processed + 1, activated = stats.activated + 1)
                    )
                }
                "someday" -> {
                    taskRepository.moveTask(taskId, userId, "someday")
                    val stats = _state.value.stepStats
                    _state.value = _state.value.copy(stepStats = stats.copy(processed = stats.processed + 1))
                }
                "complete" -> {
                    taskRepository.toggleTask(taskId, userId)
                    val stats = _state.value.stepStats
                    _state.value = _state.value.copy(
                        stepStats = stats.copy(processed = stats.processed + 1, completed = stats.completed + 1)
                    )
                }
                "trash" -> {
                    taskRepository.moveTask(taskId, userId, "trash")
                    val stats = _state.value.stepStats
                    _state.value = _state.value.copy(stepStats = stats.copy(processed = stats.processed + 1))
                }
            }
        }
    }

    fun completeReview(onComplete: () -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isCompleting = true)
            val result = reviewRepository.completeReview()
            _state.value = _state.value.copy(isCompleting = false)
            if (result.isSuccess) {
                onComplete()
            } else {
                _state.value = _state.value.copy(error = result.exceptionOrNull()?.message)
            }
        }
    }
}
