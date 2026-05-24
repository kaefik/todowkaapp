package com.todowka.app.data.repository

import com.todowka.app.data.local.db.dao.ContextDao
import com.todowka.app.data.local.db.dao.MutationDao
import com.todowka.app.data.local.db.entity.ContextEntity
import com.todowka.app.data.local.db.entity.MutationEntity
import com.todowka.app.domain.repository.ContextRepository
import com.todowka.app.util.DateTimeUtils
import kotlinx.coroutines.flow.Flow

class ContextRepositoryImpl(
    private val contextDao: ContextDao,
    private val mutationDao: MutationDao
) : ContextRepository {

    override fun getAll(userId: String): Flow<List<ContextEntity>> {
        return contextDao.getByUserId(userId)
    }

    override fun getById(id: String, userId: String): Flow<ContextEntity?> {
        return contextDao.getById(id, userId)
    }

    override suspend fun createContext(
        userId: String,
        name: String,
        color: String?,
        icon: String?
    ): ContextEntity {
        val now = DateTimeUtils.nowIso()
        val id = java.util.UUID.randomUUID().toString()
        val entity = ContextEntity(
            id = id,
            userId = userId,
            name = name,
            color = color,
            icon = icon,
            createdAt = now,
            updatedAt = now,
            _syncStatus = "local",
            _lastSyncedAt = null
        )
        contextDao.upsert(entity)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "context",
                entityId = id,
                operation = "create",
                payload = null,
                createdAt = now
            )
        )
        return entity
    }

    override suspend fun updateContext(context: ContextEntity): ContextEntity {
        val updated = context.copy(
            updatedAt = DateTimeUtils.nowIso(),
            _syncStatus = "modified"
        )
        contextDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = updated.userId,
                entityType = "context",
                entityId = updated.id,
                operation = "update",
                payload = null,
                createdAt = DateTimeUtils.nowIso()
            )
        )
        return updated
    }

    override suspend fun deleteContext(contextId: String, userId: String) {
        val context = contextDao.getByUserId(userId)
        val now = DateTimeUtils.nowIso()
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "context",
                entityId = contextId,
                operation = "delete",
                payload = null,
                createdAt = now
            )
        )
    }
}
