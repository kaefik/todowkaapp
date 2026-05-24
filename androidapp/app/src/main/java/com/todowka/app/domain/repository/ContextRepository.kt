package com.todowka.app.domain.repository

import com.todowka.app.data.local.db.entity.ContextEntity
import kotlinx.coroutines.flow.Flow

interface ContextRepository {
    fun getAll(userId: String): Flow<List<ContextEntity>>
    fun getById(id: String, userId: String): Flow<ContextEntity?>
    suspend fun createContext(
        userId: String,
        name: String,
        color: String? = null,
        icon: String? = null
    ): ContextEntity
    suspend fun updateContext(context: ContextEntity): ContextEntity
    suspend fun deleteContext(contextId: String, userId: String)
}
