package com.todowka.app.data.repository

import com.todowka.app.data.local.db.dao.CalendarEventDao
import com.todowka.app.data.local.db.dao.MutationDao
import com.todowka.app.data.local.db.entity.CalendarEventEntity
import com.todowka.app.data.local.db.entity.MutationEntity
import com.todowka.app.domain.repository.CalendarEventRepository
import com.todowka.app.util.DateTimeUtils
import kotlinx.coroutines.flow.Flow

class CalendarEventRepositoryImpl(
    private val calendarEventDao: CalendarEventDao,
    private val mutationDao: MutationDao
) : CalendarEventRepository {

    override fun getAll(userId: String): Flow<List<CalendarEventEntity>> {
        return calendarEventDao.getByUserId(userId)
    }

    override fun getById(id: String, userId: String): Flow<CalendarEventEntity?> {
        return calendarEventDao.getById(id, userId)
    }

    override fun getByDateRange(userId: String, start: String, end: String): Flow<List<CalendarEventEntity>> {
        return calendarEventDao.getByDateRange(userId, start, end)
    }

    override suspend fun createEvent(
        userId: String,
        title: String,
        startTime: String,
        endTime: String?,
        allDay: Boolean,
        color: String?,
        location: String?
    ): CalendarEventEntity {
        val now = DateTimeUtils.nowIso()
        val id = java.util.UUID.randomUUID().toString()
        val entity = CalendarEventEntity(
            id = id,
            userId = userId,
            title = title,
            startTime = startTime,
            endTime = endTime,
            allDay = allDay,
            color = color,
            location = location,
            createdAt = now,
            updatedAt = now,
            _syncStatus = "local",
            _lastSyncedAt = null
        )
        calendarEventDao.upsert(entity)
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "calendar_event",
                entityId = id,
                operation = "create",
                payload = null,
                createdAt = now
            )
        )
        return entity
    }

    override suspend fun updateEvent(event: CalendarEventEntity): CalendarEventEntity {
        val updated = event.copy(
            updatedAt = DateTimeUtils.nowIso(),
            _syncStatus = "modified"
        )
        calendarEventDao.upsert(updated)
        mutationDao.insert(
            MutationEntity(
                userId = updated.userId,
                entityType = "calendar_event",
                entityId = updated.id,
                operation = "update",
                payload = null,
                createdAt = DateTimeUtils.nowIso()
            )
        )
        return updated
    }

    override suspend fun deleteEvent(eventId: String, userId: String) {
        val now = DateTimeUtils.nowIso()
        mutationDao.insert(
            MutationEntity(
                userId = userId,
                entityType = "calendar_event",
                entityId = eventId,
                operation = "delete",
                payload = null,
                createdAt = now
            )
        )
    }
}
