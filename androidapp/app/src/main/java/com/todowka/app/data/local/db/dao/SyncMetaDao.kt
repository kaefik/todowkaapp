package com.todowka.app.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import com.todowka.app.data.local.db.entity.SyncMetaEntity

@Dao
interface SyncMetaDao {

    @Query("SELECT * FROM sync_meta WHERE userId = :userId AND resourceType = :resourceType")
    suspend fun get(userId: String, resourceType: String): SyncMetaEntity?

    @Upsert
    suspend fun upsert(meta: SyncMetaEntity)

    @Query("DELETE FROM sync_meta WHERE userId = :userId")
    suspend fun deleteByUserId(userId: String)
}
