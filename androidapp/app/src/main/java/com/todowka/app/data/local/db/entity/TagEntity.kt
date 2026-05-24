package com.todowka.app.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "tags",
    indices = [Index("userId")]
)
data class TagEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val name: String,
    val color: String? = null,
    val createdAt: String,
    val updatedAt: String,
    @ColumnInfo(defaultValue = "synced")
    val _syncStatus: String = "synced",
    val _lastSyncedAt: String? = null
)
