package com.todowka.app.domain.repository

import com.todowka.app.data.local.db.entity.ChecklistItemEntity
import kotlinx.coroutines.flow.Flow

interface ChecklistRepository {
    fun getByTaskId(taskId: String, userId: String): Flow<List<ChecklistItemEntity>>
    suspend fun createItem(
        userId: String,
        taskId: String,
        title: String,
        position: Int = 0
    ): ChecklistItemEntity
    suspend fun updateItem(item: ChecklistItemEntity): ChecklistItemEntity
    suspend fun toggleItem(itemId: String, userId: String)
    suspend fun deleteItem(itemId: String, userId: String)
}
