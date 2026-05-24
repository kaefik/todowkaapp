package com.todowka.app.data.repository

import com.todowka.app.data.local.db.dao.MutationDao
import com.todowka.app.data.local.db.dao.TaskDao
import com.todowka.app.data.local.db.dao.TagDao
import com.todowka.app.data.local.db.entity.MutationEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.data.local.db.entity.TaskTagCrossRef
import com.todowka.app.domain.repository.TaskRepository
import com.todowka.app.util.DateTimeUtils
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class TaskRepositoryImpl(
    private val taskDao: TaskDao,
    private val mutationDao: MutationDao,
    private val tagDao: TagDao
) : TaskRepository {

    override fun getByStatus(userId: String, status: String): Flow<List<TaskEntity>> {
        return taskDao.getByStatus(userId, status)
    }

    override fun getByProject(userId: String, projectId: String): Flow<List<TaskEntity>> {
        return taskDao.getTasksByProject(userId, projectId)
    }

    override fun getByArea(userId: String, areaId: String): Flow<List<TaskEntity>> {
        return taskDao.getTasksByArea(userId, areaId)
    }

    override fun getDueTasks(userId: String, date: String): Flow<List<TaskEntity>> {
        return taskDao.getDueTasks(userId, date)
    }

    override fun getOverdueTasks(userId: String, beforeDate: String): Flow<List<TaskEntity>> {
        return taskDao.getOverdueTasks(userId, beforeDate)
    }

    override fun getCounts(userId: String): Flow<Map<String, Int>> {
        return taskDao.getCounts(userId).map { list ->
            list.associate { it.gtdStatus to it.cnt }
        }
    }

    override suspend fun createTask(
        userId: String,
        title: String,
        gtdStatus: String,
        description: String?,
        contextId: String?,
        areaId: String?,
        projectId: String?,
        dueDate: String?,
        tagIds: List<String>?
    ): TaskEntity {
        val now = DateTimeUtils.nowIso()
        val id = java.util.UUID.randomUUID().toString()
        val entity = TaskEntity(
            id = id,
            userId = userId,
            title = title,
            description = description,
            gtdStatus = gtdStatus,
            contextId = contextId,
            areaId = areaId,
            projectId = projectId,
            dueDate = dueDate,
            createdAt = now,
            updatedAt = now,
            _syncStatus = "local",
            _lastSyncedAt = null
        )
        taskDao.upsert(entity)
        if (!tagIds.isNullOrEmpty()) {
            tagDao.deleteCrossRefsForTask(id)
            tagDao.insertCrossRefs(tagIds.map { TaskTagCrossRef(id, it, userId) })
        }
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "task",
                entityId = id,
                operation = "create",
                payload = null,
                createdAt = now
            )
        )
        return entity
    }

    override suspend fun updateTask(task: TaskEntity): TaskEntity {
        val updated = task.copy(
            updatedAt = DateTimeUtils.nowIso(),
            _syncStatus = "modified"
        )
        taskDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = updated.userId,
                entityType = "task",
                entityId = updated.id,
                operation = "update",
                payload = null,
                createdAt = DateTimeUtils.nowIso()
            )
        )
        return updated
    }

    override suspend fun toggleTask(taskId: String, userId: String) {
        val task = taskDao.getByIdSync(taskId) ?: return
        val now = DateTimeUtils.nowIso()
        val updated = task.copy(
            isCompleted = !task.isCompleted,
            completedAt = if (!task.isCompleted) now else null,
            updatedAt = now,
            _syncStatus = "modified"
        )
        taskDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "task",
                entityId = taskId,
                operation = "toggle",
                payload = null,
                createdAt = now
            )
        )
    }

    override suspend fun moveTask(taskId: String, userId: String, newStatus: String) {
        val task = taskDao.getByIdSync(taskId) ?: return
        val now = DateTimeUtils.nowIso()
        val updated = task.copy(
            gtdStatus = newStatus,
            updatedAt = now,
            _syncStatus = "modified"
        )
        taskDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "task",
                entityId = taskId,
                operation = "move",
                payload = """{"gtd_status":"$newStatus"}""",
                createdAt = now
            )
        )
    }

    override suspend fun reorderTask(taskId: String, position: Int) {
        taskDao.updatePosition(taskId, position)
        val task = taskDao.getByIdSync(taskId) ?: return
        val now = DateTimeUtils.nowIso()
        mutationDao.insert(
            MutationEntity(
                userId = task.userId,
                entityType = "task",
                entityId = taskId,
                operation = "reorder",
                payload = """{"position":$position}""",
                createdAt = now
            )
        )
    }

    override suspend fun deleteTask(taskId: String, userId: String) {
        val task = taskDao.getByIdSync(taskId) ?: return
        val now = DateTimeUtils.nowIso()
        val updated = task.copy(
            _syncStatus = "deleted",
            trashedAt = now,
            updatedAt = now
        )
        taskDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "task",
                entityId = taskId,
                operation = "delete",
                payload = null,
                createdAt = now
            )
        )
    }

    override suspend fun clearCompleted(userId: String) {
        val tasks = taskDao.getPendingSync(userId)
        val now = DateTimeUtils.nowIso()
        tasks.filter { it.isCompleted && it._syncStatus != "deleted" }.forEach { task ->
            val updated = task.copy(_syncStatus = "deleted", trashedAt = now, updatedAt = now)
            taskDao.upsert(updated)
            mutationDao.insert(
                MutationEntity(
                    userId = userId,
                    entityType = "task",
                    entityId = task.id,
                    operation = "delete",
                    payload = null,
                    createdAt = now
                )
            )
        }
    }

    override suspend fun clearTrash(userId: String) {
        val tasks = taskDao.getPendingSync(userId)
        val now = DateTimeUtils.nowIso()
        tasks.filter { it._syncStatus == "deleted" }.forEach { task ->
            mutationDao.insert(
                MutationEntity(
                    userId = userId,
                    entityType = "task",
                    entityId = task.id,
                    operation = "delete",
                    payload = null,
                    createdAt = now
                )
            )
        }
    }
}
