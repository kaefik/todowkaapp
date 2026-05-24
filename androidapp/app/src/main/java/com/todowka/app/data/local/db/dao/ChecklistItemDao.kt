package com.todowka.app.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import com.todowka.app.data.local.db.entity.ChecklistItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ChecklistItemDao {

    @Query("SELECT * FROM checklist_items WHERE userId = :userId AND _syncStatus != 'deleted' ORDER BY position ASC")
    fun getByUserId(userId: String): Flow<List<ChecklistItemEntity>>

    @Query("SELECT * FROM checklist_items WHERE id = :id AND userId = :userId AND _syncStatus != 'deleted'")
    fun getById(id: String, userId: String): Flow<ChecklistItemEntity?>

    @Upsert
    suspend fun upsert(entity: ChecklistItemEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<ChecklistItemEntity>)

    @Query("DELETE FROM checklist_items WHERE userId = :userId")
    suspend fun deleteByUserId(userId: String)

    @Query("SELECT * FROM checklist_items WHERE id = :id")
    suspend fun getByIdSync(id: String): ChecklistItemEntity?

    @Query("SELECT * FROM checklist_items WHERE taskId = :taskId AND userId = :userId AND _syncStatus != 'deleted' ORDER BY position ASC")
    fun getByTaskId(taskId: String, userId: String): Flow<List<ChecklistItemEntity>>

    @Query("SELECT * FROM checklist_items WHERE taskId IN (:taskIds) AND _syncStatus != 'deleted' ORDER BY position ASC")
    fun getByTaskIds(taskIds: List<String>): Flow<List<ChecklistItemEntity>>
}
