package com.todowka.app.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import com.todowka.app.data.local.db.entity.ContextEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ContextDao {

    @Query("SELECT * FROM contexts WHERE userId = :userId AND _syncStatus != 'deleted' ORDER BY name ASC")
    fun getByUserId(userId: String): Flow<List<ContextEntity>>

    @Query("SELECT * FROM contexts WHERE id = :id AND userId = :userId AND _syncStatus != 'deleted'")
    fun getById(id: String, userId: String): Flow<ContextEntity?>

    @Upsert
    fun upsert(entity: ContextEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun upsertAll(entities: List<ContextEntity>)

    @Query("DELETE FROM contexts WHERE userId = :userId")
    fun deleteByUserId(userId: String)

    @Query("SELECT * FROM contexts WHERE userId = :userId AND _syncStatus != 'deleted' ORDER BY name ASC")
    fun getAllForUser(userId: String): Flow<List<ContextEntity>>
}
