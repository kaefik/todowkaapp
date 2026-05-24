package com.todowka.app.domain.repository

import com.todowka.app.data.local.db.entity.TaskEntity
import kotlinx.coroutines.flow.Flow

interface TaskRepository {
    fun getByStatus(userId: String, status: String): Flow<List<TaskEntity>>
    fun getByProject(userId: String, projectId: String): Flow<List<TaskEntity>>
    fun getByArea(userId: String, areaId: String): Flow<List<TaskEntity>>
    fun getDueTasks(userId: String, date: String): Flow<List<TaskEntity>>
    fun getOverdueTasks(userId: String, beforeDate: String): Flow<List<TaskEntity>>
    fun getCounts(userId: String): Flow<Map<String, Int>>
    suspend fun createTask(
        userId: String,
        title: String,
        gtdStatus: String,
        description: String? = null,
        contextId: String? = null,
        areaId: String? = null,
        projectId: String? = null,
        dueDate: String? = null,
        tagIds: List<String>? = null
    ): TaskEntity
    suspend fun updateTask(task: TaskEntity): TaskEntity
    suspend fun toggleTask(taskId: String, userId: String)
    suspend fun moveTask(taskId: String, userId: String, newStatus: String)
    suspend fun reorderTask(taskId: String, position: Int)
    suspend fun deleteTask(taskId: String, userId: String)
    suspend fun clearCompleted(userId: String)
    suspend fun clearTrash(userId: String)
}
