package com.todowka.app.data.repository

import com.todowka.app.data.local.db.dao.AreaDao
import com.todowka.app.data.local.db.dao.MutationDao
import com.todowka.app.data.local.db.entity.AreaEntity
import com.todowka.app.data.local.db.entity.MutationEntity
import com.todowka.app.domain.repository.AreaRepository
import com.todowka.app.util.DateTimeUtils
import kotlinx.coroutines.flow.Flow

class AreaRepositoryImpl(
    private val areaDao: AreaDao,
    private val mutationDao: MutationDao
) : AreaRepository {

    override fun getAll(userId: String): Flow<List<AreaEntity>> {
        return areaDao.getByUserId(userId)
    }

    override fun getById(id: String, userId: String): Flow<AreaEntity?> {
        return areaDao.getById(id, userId)
    }

    override suspend fun createArea(
        userId: String,
        name: String,
        description: String?,
        color: String?
    ): AreaEntity {
        val now = DateTimeUtils.nowIso()
        val id = java.util.UUID.randomUUID().toString()
        val entity = AreaEntity(
            id = id,
            userId = userId,
            name = name,
            description = description,
            color = color,
            createdAt = now,
            updatedAt = now,
            _syncStatus = "local",
            _lastSyncedAt = null
        )
        areaDao.upsert(entity)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "area",
                entityId = id,
                operation = "create",
                payload = null,
                createdAt = now
            )
        )
        return entity
    }

    override suspend fun updateArea(area: AreaEntity): AreaEntity {
        val updated = area.copy(
            updatedAt = DateTimeUtils.nowIso(),
            _syncStatus = "modified"
        )
        areaDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = updated.userId,
                entityType = "area",
                entityId = updated.id,
                operation = "update",
                payload = null,
                createdAt = DateTimeUtils.nowIso()
            )
        )
        return updated
    }

    override suspend fun deleteArea(areaId: String, userId: String) {
        val area = areaDao.getByIdSync(areaId) ?: return
        val now = DateTimeUtils.nowIso()
        val updated = area.copy(_syncStatus = "deleted", updatedAt = now)
        areaDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "area",
                entityId = areaId,
                operation = "delete",
                payload = null,
                createdAt = now
            )
        )
    }
}
