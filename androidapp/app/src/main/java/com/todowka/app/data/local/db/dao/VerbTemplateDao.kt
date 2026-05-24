package com.todowka.app.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import com.todowka.app.data.local.db.entity.VerbTemplateEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VerbTemplateDao {

    @Query("SELECT * FROM verb_templates WHERE userId = :userId AND _syncStatus != 'deleted' ORDER BY position ASC")
    fun getByUserId(userId: String): Flow<List<VerbTemplateEntity>>

    @Query("SELECT * FROM verb_templates WHERE id = :id AND userId = :userId AND _syncStatus != 'deleted'")
    fun getById(id: String, userId: String): Flow<VerbTemplateEntity?>

    @Upsert
    suspend fun upsert(entity: VerbTemplateEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<VerbTemplateEntity>)

    @Query("DELETE FROM verb_templates WHERE userId = :userId")
    suspend fun deleteByUserId(userId: String)
}
