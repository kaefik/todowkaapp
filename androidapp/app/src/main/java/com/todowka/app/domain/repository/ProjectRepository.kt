package com.todowka.app.domain.repository

import com.todowka.app.data.local.db.entity.ProjectEntity
import kotlinx.coroutines.flow.Flow

interface ProjectRepository {
    fun getAll(userId: String): Flow<List<ProjectEntity>>
    fun getActive(userId: String): Flow<List<ProjectEntity>>
    fun getById(id: String, userId: String): Flow<ProjectEntity?>
    suspend fun createProject(
        userId: String,
        name: String,
        description: String? = null,
        color: String? = null,
        areaId: String? = null
    ): ProjectEntity
    suspend fun updateProject(project: ProjectEntity): ProjectEntity
    suspend fun deleteProject(projectId: String, userId: String)
}
