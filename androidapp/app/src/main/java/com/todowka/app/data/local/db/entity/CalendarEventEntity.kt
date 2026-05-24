package com.todowka.app.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "calendar_events",
    indices = [Index("userId")]
)
data class CalendarEventEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val title: String,
    val description: String? = null,
    val startTime: String,
    val endTime: String? = null,
    @ColumnInfo(defaultValue = "0")
    val allDay: Boolean = false,
    val color: String? = null,
    val location: String? = null,
    val attendees: String? = null,
    val recurrenceType: String? = null,
    val recurrenceConfig: String? = null,
    val recurrenceEndDate: String? = null,
    val createdAt: String,
    val updatedAt: String,
    @ColumnInfo(defaultValue = "synced")
    val _syncStatus: String = "synced",
    val _lastSyncedAt: String? = null
)
