package com.todowka.app.domain.repository

import com.todowka.app.data.local.db.entity.VerbTemplateEntity
import kotlinx.coroutines.flow.Flow

interface VerbTemplateRepository {
    fun getAll(userId: String): Flow<List<VerbTemplateEntity>>
    fun getById(id: String, userId: String): Flow<VerbTemplateEntity?>
    suspend fun createTemplate(
        userId: String,
        text: String,
        icon: String? = null
    ): VerbTemplateEntity
    suspend fun updateTemplate(template: VerbTemplateEntity): VerbTemplateEntity
    suspend fun deleteTemplate(templateId: String, userId: String)
}
