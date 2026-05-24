package com.todowka.app.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "projects",
    foreignKeys = [
        ForeignKey(
            entity = AreaEntity::class,
            parentColumns = ["id"],
            childColumns = ["areaId"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [
        Index("userId"),
        Index("areaId")
    ]
)
data class ProjectEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val name: String,
    val description: String? = null,
    val color: String? = null,
    val areaId: String? = null,
    @ColumnInfo(defaultValue = "1")
    val isActive: Boolean = true,
    val sortOrder: Int = 0,
    val createdAt: String,
    val updatedAt: String,
    @ColumnInfo(defaultValue = "synced")
    val _syncStatus: String = "synced",
    val _lastSyncedAt: String? = null
)
