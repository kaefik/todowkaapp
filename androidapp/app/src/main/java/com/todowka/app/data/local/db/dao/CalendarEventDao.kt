package com.todowka.app.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import com.todowka.app.data.local.db.entity.CalendarEventEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CalendarEventDao {

    @Query("SELECT * FROM calendar_events WHERE userId = :userId AND _syncStatus != 'deleted' ORDER BY startTime ASC")
    fun getByUserId(userId: String): Flow<List<CalendarEventEntity>>

    @Query("SELECT * FROM calendar_events WHERE id = :id AND userId = :userId AND _syncStatus != 'deleted'")
    fun getById(id: String, userId: String): Flow<CalendarEventEntity?>

    @Upsert
    fun upsert(entity: CalendarEventEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun upsertAll(entities: List<CalendarEventEntity>)

    @Query("DELETE FROM calendar_events WHERE userId = :userId")
    fun deleteByUserId(userId: String)

    @Query("SELECT * FROM calendar_events WHERE userId = :userId AND startTime >= :start AND startTime <= :end AND _syncStatus != 'deleted' ORDER BY startTime ASC")
    fun getByDateRange(userId: String, start: String, end: String): Flow<List<CalendarEventEntity>>
}
