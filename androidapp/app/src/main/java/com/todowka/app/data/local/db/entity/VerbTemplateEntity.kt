package com.todowka.app.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "verb_templates",
    indices = [Index("userId")]
)
data class VerbTemplateEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val text: String,
    val icon: String? = null,
    val position: Int = 0,
    val createdAt: String,
    val updatedAt: String,
    @ColumnInfo(defaultValue = "synced")
    val _syncStatus: String = "synced",
    val _lastSyncedAt: String? = null
)
