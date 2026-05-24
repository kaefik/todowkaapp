package com.todowka.app.domain.repository

import com.todowka.app.data.local.db.entity.CalendarEventEntity
import kotlinx.coroutines.flow.Flow

interface CalendarEventRepository {
    fun getAll(userId: String): Flow<List<CalendarEventEntity>>
    fun getById(id: String, userId: String): Flow<CalendarEventEntity?>
    fun getByDateRange(userId: String, start: String, end: String): Flow<List<CalendarEventEntity>>
    suspend fun createEvent(
        userId: String,
        title: String,
        startTime: String,
        endTime: String? = null,
        allDay: Boolean = false,
        color: String? = null,
        location: String? = null
    ): CalendarEventEntity
    suspend fun updateEvent(event: CalendarEventEntity): CalendarEventEntity
    suspend fun deleteEvent(eventId: String, userId: String)
}
