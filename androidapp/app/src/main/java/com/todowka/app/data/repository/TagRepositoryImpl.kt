package com.todowka.app.data.repository

import com.todowka.app.data.local.db.dao.MutationDao
import com.todowka.app.data.local.db.dao.TagDao
import com.todowka.app.data.local.db.entity.MutationEntity
import com.todowka.app.data.local.db.entity.TagEntity
import com.todowka.app.domain.repository.TagRepository
import com.todowka.app.util.DateTimeUtils
import kotlinx.coroutines.flow.Flow

class TagRepositoryImpl(
    private val tagDao: TagDao,
    private val mutationDao: MutationDao
) : TagRepository {

    override fun getAll(userId: String): Flow<List<TagEntity>> {
        return tagDao.getByUserId(userId)
    }

    override fun getById(id: String, userId: String): Flow<TagEntity?> {
        return tagDao.getById(id, userId)
    }

    override suspend fun createTag(
        userId: String,
        name: String,
        color: String?
    ): TagEntity {
        val now = DateTimeUtils.nowIso()
        val id = java.util.UUID.randomUUID().toString()
        val entity = TagEntity(
            id = id,
            userId = userId,
            name = name,
            color = color,
            createdAt = now,
            updatedAt = now,
            _syncStatus = "local",
            _lastSyncedAt = null
        )
        tagDao.upsert(entity)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "tag",
                entityId = id,
                operation = "create",
                payload = null,
                createdAt = now
            )
        )
        return entity
    }

    override suspend fun updateTag(tag: TagEntity): TagEntity {
        val updated = tag.copy(
            updatedAt = DateTimeUtils.nowIso(),
            _syncStatus = "modified"
        )
        tagDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = updated.userId,
                entityType = "tag",
                entityId = updated.id,
                operation = "update",
                payload = null,
                createdAt = DateTimeUtils.nowIso()
            )
        )
        return updated
    }

    override suspend fun deleteTag(tagId: String, userId: String) {
        val now = DateTimeUtils.nowIso()
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "tag",
                entityId = tagId,
                operation = "delete",
                payload = null,
                createdAt = now
            )
        )
    }
}
