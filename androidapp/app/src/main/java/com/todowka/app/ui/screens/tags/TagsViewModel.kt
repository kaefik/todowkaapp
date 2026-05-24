package com.todowka.app.ui.screens.tags

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.todowka.app.data.local.db.entity.TagEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.domain.repository.TagRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TagsState(
    val tags: List<TagEntity> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

class TagsViewModel(
    private val tagRepository: TagRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(TagsState())
    val state: StateFlow<TagsState> = _state.asStateFlow()

    init {
        loadTags()
    }

    fun loadTags() {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            tagRepository.getAll(userId).collect { tags ->
                _state.value = _state.value.copy(tags = tags, isLoading = false)
            }
        }
    }

    fun createTag(name: String, color: String? = null) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            try {
                tagRepository.createTag(userId, name, color)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }

    fun updateTag(tag: TagEntity) {
        viewModelScope.launch {
            try {
                tagRepository.updateTag(tag)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }

    fun deleteTag(tagId: String) {
        val userId = authPreferences.currentUserId ?: return
        viewModelScope.launch {
            try {
                tagRepository.deleteTag(tagId, userId)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }
}
