package com.todowka.app.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "tasks",
    foreignKeys = [
        ForeignKey(
            entity = ContextEntity::class,
            parentColumns = ["id"],
            childColumns = ["contextId"],
            onDelete = ForeignKey.SET_NULL
        ),
        ForeignKey(
            entity = AreaEntity::class,
            parentColumns = ["id"],
            childColumns = ["areaId"],
            onDelete = ForeignKey.SET_NULL
        ),
        ForeignKey(
            entity = ProjectEntity::class,
            parentColumns = ["id"],
            childColumns = ["projectId"],
            onDelete = ForeignKey.SET_NULL
        ),
        ForeignKey(
            entity = CalendarEventEntity::class,
            parentColumns = ["id"],
            childColumns = ["eventId"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [
        Index("userId"),
        Index("gtdStatus"),
        Index("contextId"),
        Index("areaId"),
        Index("projectId"),
        Index("eventId")
    ]
)
data class TaskEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val title: String,
    val description: String? = null,
    val gtdStatus: String,
    val contextId: String? = null,
    val areaId: String? = null,
    val projectId: String? = null,
    val eventId: String? = null,
    val isCompleted: Boolean = false,
    val completedAt: String? = null,
    val position: Int = 0,
    val dueDate: String? = null,
    val notes: String? = null,
    val recurrenceType: String? = null,
    val recurrenceConfig: String? = null,
    val recurrenceEndDate: String? = null,
    val reminderTime: String? = null,
    val reminderOffsets: String? = null,
    val sentReminderOffsets: String? = null,
    val reminderFired: Boolean = false,
    val deadlineNotified: Boolean = false,
    val lastReminderSentAt: String? = null,
    val trashedAt: String? = null,
    val createdAt: String,
    val updatedAt: String,
    @ColumnInfo(defaultValue = "synced")
    val _syncStatus: String = "synced",
    val _lastSyncedAt: String? = null
)
