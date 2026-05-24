package com.todowka.app.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "checklist_items",
    foreignKeys = [
        ForeignKey(
            entity = TaskEntity::class,
            parentColumns = ["id"],
            childColumns = ["taskId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("taskId")]
)
data class ChecklistItemEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val taskId: String,
    val title: String,
    val isCompleted: Boolean = false,
    val position: Int = 0,
    val completedAt: String? = null,
    val createdAt: String,
    val updatedAt: String,
    @ColumnInfo(defaultValue = "synced")
    val _syncStatus: String = "synced",
    val _lastSyncedAt: String? = null
)
