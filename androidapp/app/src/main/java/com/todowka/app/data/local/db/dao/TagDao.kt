package com.todowka.app.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import com.todowka.app.data.local.db.entity.TagEntity
import com.todowka.app.data.local.db.entity.TaskTagCrossRef
import kotlinx.coroutines.flow.Flow

data class TagWithTaskId(
    val tag: TagEntity,
    val taskId: String
)

@Dao
interface TagDao {

    @Query("SELECT * FROM tags WHERE userId = :userId AND _syncStatus != 'deleted' ORDER BY name ASC")
    fun getByUserId(userId: String): Flow<List<TagEntity>>

    @Query("SELECT * FROM tags WHERE id = :id AND userId = :userId AND _syncStatus != 'deleted'")
    fun getById(id: String, userId: String): Flow<TagEntity?>

    @Upsert
    fun upsert(entity: TagEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun upsertAll(entities: List<TagEntity>)

    @Query("DELETE FROM tags WHERE userId = :userId")
    fun deleteByUserId(userId: String)

    @Query("""
        SELECT t.*, ctr.taskId as crossTaskId FROM tags t
        INNER JOIN task_tag_cross_ref ctr ON t.id = ctr.tagId
        WHERE ctr.taskId IN (:taskIds) AND t._syncStatus != 'deleted'
    """)
    fun getRawByTaskIds(taskIds: List<String>): Flow<List<TagWithTaskIdRaw>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertCrossRefs(refs: List<TaskTagCrossRef>)

    @Query("DELETE FROM task_tag_cross_ref WHERE taskId = :taskId")
    fun deleteCrossRefsForTask(taskId: String)
}

data class TagWithTaskIdRaw(
    val id: String,
    val userId: String,
    val name: String,
    val color: String?,
    val createdAt: String,
    val updatedAt: String,
    val _syncStatus: String,
    val _lastSyncedAt: String?,
    val crossTaskId: String
)
