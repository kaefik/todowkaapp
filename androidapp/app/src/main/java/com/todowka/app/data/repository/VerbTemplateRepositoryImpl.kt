package com.todowka.app.data.repository

import com.todowka.app.data.local.db.dao.MutationDao
import com.todowka.app.data.local.db.dao.VerbTemplateDao
import com.todowka.app.data.local.db.entity.MutationEntity
import com.todowka.app.data.local.db.entity.VerbTemplateEntity
import com.todowka.app.domain.repository.VerbTemplateRepository
import com.todowka.app.util.DateTimeUtils
import kotlinx.coroutines.flow.Flow

class VerbTemplateRepositoryImpl(
    private val verbTemplateDao: VerbTemplateDao,
    private val mutationDao: MutationDao
) : VerbTemplateRepository {

    override fun getAll(userId: String): Flow<List<VerbTemplateEntity>> {
        return verbTemplateDao.getByUserId(userId)
    }

    override fun getById(id: String, userId: String): Flow<VerbTemplateEntity?> {
        return verbTemplateDao.getById(id, userId)
    }

    override suspend fun createTemplate(
        userId: String,
        text: String,
        icon: String?
    ): VerbTemplateEntity {
        val now = DateTimeUtils.nowIso()
        val id = java.util.UUID.randomUUID().toString()
        val entity = VerbTemplateEntity(
            id = id,
            userId = userId,
            text = text,
            icon = icon,
            createdAt = now,
            updatedAt = now,
            _syncStatus = "local",
            _lastSyncedAt = null
        )
        verbTemplateDao.upsert(entity)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "verb_template",
                entityId = id,
                operation = "create",
                payload = null,
                createdAt = now
            )
        )
        return entity
    }

    override suspend fun updateTemplate(template: VerbTemplateEntity): VerbTemplateEntity {
        val updated = template.copy(
            updatedAt = DateTimeUtils.nowIso(),
            _syncStatus = "modified"
        )
        verbTemplateDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = updated.userId,
                entityType = "verb_template",
                entityId = updated.id,
                operation = "update",
                payload = null,
                createdAt = DateTimeUtils.nowIso()
            )
        )
        return updated
    }

    override suspend fun deleteTemplate(templateId: String, userId: String) {
        val now = DateTimeUtils.nowIso()
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "verb_template",
                entityId = templateId,
                operation = "delete",
                payload = null,
                createdAt = now
            )
        )
    }
}
