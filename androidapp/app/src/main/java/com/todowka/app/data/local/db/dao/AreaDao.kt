package com.todowka.app.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import com.todowka.app.data.local.db.entity.AreaEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AreaDao {

    @Query("SELECT * FROM areas WHERE userId = :userId AND _syncStatus != 'deleted' ORDER BY sortOrder ASC")
    fun getByUserId(userId: String): Flow<List<AreaEntity>>

    @Query("SELECT * FROM areas WHERE id = :id AND userId = :userId AND _syncStatus != 'deleted'")
    fun getById(id: String, userId: String): Flow<AreaEntity?>

    @Upsert
    fun upsert(entity: AreaEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun upsertAll(entities: List<AreaEntity>)

    @Query("DELETE FROM areas WHERE userId = :userId")
    fun deleteByUserId(userId: String)

    @Query("SELECT * FROM areas WHERE userId = :userId AND _syncStatus != 'deleted' ORDER BY sortOrder ASC")
    fun getAllSorted(userId: String): Flow<List<AreaEntity>>

    @Query("SELECT * FROM areas WHERE id = :id")
    suspend fun getByIdSync(id: String): AreaEntity?
}
