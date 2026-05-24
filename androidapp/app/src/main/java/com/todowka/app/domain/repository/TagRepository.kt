package com.todowka.app.domain.repository

import com.todowka.app.data.local.db.entity.TagEntity
import kotlinx.coroutines.flow.Flow

interface TagRepository {
    fun getAll(userId: String): Flow<List<TagEntity>>
    fun getById(id: String, userId: String): Flow<TagEntity?>
    suspend fun createTag(
        userId: String,
        name: String,
        color: String? = null
    ): TagEntity
    suspend fun updateTag(tag: TagEntity): TagEntity
    suspend fun deleteTag(tagId: String, userId: String)
}
