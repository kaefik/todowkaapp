package com.todowka.app.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import com.todowka.app.data.local.db.entity.TaskEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {

    @Query("SELECT * FROM tasks WHERE userId = :userId AND _syncStatus != 'deleted' ORDER BY position ASC")
    fun getByUserId(userId: String): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE id = :id AND userId = :userId AND _syncStatus != 'deleted'")
    fun getById(id: String, userId: String): Flow<TaskEntity?>

    @Upsert
    suspend fun upsert(entity: TaskEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<TaskEntity>)

    @Query("DELETE FROM tasks WHERE userId = :userId")
    suspend fun deleteByUserId(userId: String)

    @Query("SELECT * FROM tasks WHERE userId = :userId AND gtdStatus = :status AND _syncStatus != 'deleted' ORDER BY position ASC")
    fun getByStatus(userId: String, status: String): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE id = :id")
    suspend fun getByIdSync(id: String): TaskEntity?

    @Query("SELECT * FROM tasks WHERE userId = :userId AND _syncStatus != 'synced'")
    suspend fun getPendingSync(userId: String): List<TaskEntity>

    @Query("UPDATE tasks SET _syncStatus = :status, _lastSyncedAt = :syncedAt WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String, syncedAt: String?)

    @Query("SELECT * FROM tasks WHERE userId = :userId AND projectId = :projectId AND _syncStatus != 'deleted' ORDER BY position ASC")
    fun getTasksByProject(userId: String, projectId: String): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE userId = :userId AND areaId = :areaId AND _syncStatus != 'deleted' ORDER BY position ASC")
    fun getTasksByArea(userId: String, areaId: String): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE userId = :userId AND dueDate = :date AND _syncStatus != 'deleted' ORDER BY position ASC")
    fun getDueTasks(userId: String, date: String): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE userId = :userId AND dueDate < :beforeDate AND isCompleted = 0 AND _syncStatus != 'deleted'")
    fun getOverdueTasks(userId: String, beforeDate: String): Flow<List<TaskEntity>>

    @Query("SELECT gtdStatus, COUNT(*) as cnt FROM tasks WHERE userId = :userId AND _syncStatus != 'deleted' GROUP BY gtdStatus")
    fun getCounts(userId: String): Flow<List<StatusCount>>

    @Query("UPDATE tasks SET position = :position WHERE id = :id")
    suspend fun updatePosition(id: String, position: Int)
}

data class StatusCount(
    val gtdStatus: String,
    val cnt: Int
)
