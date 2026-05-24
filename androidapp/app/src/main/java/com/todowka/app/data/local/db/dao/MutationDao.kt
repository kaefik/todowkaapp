package com.todowka.app.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.todowka.app.data.local.db.entity.MutationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MutationDao {

    @Query("SELECT * FROM mutations WHERE userId = :userId ORDER BY createdAt ASC")
    fun getPendingByUserId(userId: String): Flow<List<MutationEntity>>

    @Query("SELECT * FROM mutations WHERE userId = :userId ORDER BY createdAt ASC")
    suspend fun getPendingByUserIdSync(userId: String): List<MutationEntity>

    @Query("SELECT * FROM mutations WHERE entityType = :entityType AND entityId = :entityId AND userId = :userId")
    suspend fun getByEntityAndUser(entityType: String, entityId: String, userId: String): List<MutationEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(mutation: MutationEntity)

    @Query("DELETE FROM mutations WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("DELETE FROM mutations WHERE entityType = :entityType AND entityId = :entityId AND userId = :userId")
    suspend fun deleteByEntityAndUser(entityType: String, entityId: String, userId: String)
}
