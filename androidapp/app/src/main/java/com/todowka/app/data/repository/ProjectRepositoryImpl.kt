package com.todowka.app.data.repository

import com.todowka.app.data.local.db.dao.MutationDao
import com.todowka.app.data.local.db.dao.ProjectDao
import com.todowka.app.data.local.db.entity.MutationEntity
import com.todowka.app.data.local.db.entity.ProjectEntity
import com.todowka.app.domain.repository.ProjectRepository
import com.todowka.app.util.DateTimeUtils
import kotlinx.coroutines.flow.Flow

class ProjectRepositoryImpl(
    private val projectDao: ProjectDao,
    private val mutationDao: MutationDao
) : ProjectRepository {

    override fun getAll(userId: String): Flow<List<ProjectEntity>> {
        return projectDao.getByUserId(userId)
    }

    override fun getActive(userId: String): Flow<List<ProjectEntity>> {
        return projectDao.getActive(userId)
    }

    override fun getById(id: String, userId: String): Flow<ProjectEntity?> {
        return projectDao.getById(id, userId)
    }

    override suspend fun createProject(
        userId: String,
        name: String,
        description: String?,
        color: String?,
        areaId: String?
    ): ProjectEntity {
        val now = DateTimeUtils.nowIso()
        val id = java.util.UUID.randomUUID().toString()
        val entity = ProjectEntity(
            id = id,
            userId = userId,
            name = name,
            description = description,
            color = color,
            areaId = areaId,
            createdAt = now,
            updatedAt = now,
            _syncStatus = "local",
            _lastSyncedAt = null
        )
        projectDao.upsert(entity)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "project",
                entityId = id,
                operation = "create",
                payload = null,
                createdAt = now
            )
        )
        return entity
    }

    override suspend fun updateProject(project: ProjectEntity): ProjectEntity {
        val updated = project.copy(
            updatedAt = DateTimeUtils.nowIso(),
            _syncStatus = "modified"
        )
        projectDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = updated.userId,
                entityType = "project",
                entityId = updated.id,
                operation = "update",
                payload = null,
                createdAt = DateTimeUtils.nowIso()
            )
        )
        return updated
    }

    override suspend fun deleteProject(projectId: String, userId: String) {
        val project = projectDao.getByIdSync(projectId) ?: return
        val now = DateTimeUtils.nowIso()
        val updated = project.copy(_syncStatus = "deleted", updatedAt = now)
        projectDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "project",
                entityId = projectId,
                operation = "delete",
                payload = null,
                createdAt = now
            )
        )
    }
}
