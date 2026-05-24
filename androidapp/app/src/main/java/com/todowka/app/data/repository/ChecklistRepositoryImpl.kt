package com.todowka.app.data.repository

import com.todowka.app.data.local.db.dao.ChecklistItemDao
import com.todowka.app.data.local.db.dao.MutationDao
import com.todowka.app.data.local.db.entity.ChecklistItemEntity
import com.todowka.app.data.local.db.entity.MutationEntity
import com.todowka.app.domain.repository.ChecklistRepository
import com.todowka.app.util.DateTimeUtils
import kotlinx.coroutines.flow.Flow

class ChecklistRepositoryImpl(
    private val checklistItemDao: ChecklistItemDao,
    private val mutationDao: MutationDao
) : ChecklistRepository {

    override fun getByTaskId(taskId: String, userId: String): Flow<List<ChecklistItemEntity>> {
        return checklistItemDao.getByTaskId(taskId, userId)
    }

    override suspend fun createItem(
        userId: String,
        taskId: String,
        title: String,
        position: Int
    ): ChecklistItemEntity {
        val now = DateTimeUtils.nowIso()
        val id = java.util.UUID.randomUUID().toString()
        val entity = ChecklistItemEntity(
            id = id,
            userId = userId,
            taskId = taskId,
            title = title,
            position = position,
            createdAt = now,
            updatedAt = now,
            _syncStatus = "local",
            _lastSyncedAt = null
        )
        checklistItemDao.upsert(entity)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "checklist_item",
                entityId = id,
                operation = "create",
                payload = """{"task_id":"$taskId"}""",
                createdAt = now
            )
        )
        return entity
    }

    override suspend fun updateItem(item: ChecklistItemEntity): ChecklistItemEntity {
        val updated = item.copy(
            updatedAt = DateTimeUtils.nowIso(),
            _syncStatus = "modified"
        )
        checklistItemDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = updated.userId,
                entityType = "checklist_item",
                entityId = updated.id,
                operation = "update",
                payload = """{"task_id":"${updated.taskId}"}""",
                createdAt = DateTimeUtils.nowIso()
            )
        )
        return updated
    }

    override suspend fun toggleItem(itemId: String, userId: String) {
        val items = checklistItemDao.getByUserId(userId)
        val now = DateTimeUtils.nowIso()
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "checklist_item",
                entityId = itemId,
                operation = "toggle",
                payload = null,
                createdAt = now
            )
        )
    }

    override suspend fun deleteItem(itemId: String, userId: String) {
        val now = DateTimeUtils.nowIso()
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "checklist_item",
                entityId = itemId,
                operation = "delete",
                payload = null,
                createdAt = now
            )
        )
    }
}
