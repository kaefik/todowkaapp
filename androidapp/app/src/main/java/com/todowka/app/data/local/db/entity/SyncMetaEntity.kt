package com.todowka.app.data.local.db.entity

import androidx.room.Entity

@Entity(
    tableName = "sync_meta",
    primaryKeys = ["userId", "resourceType"]
)
data class SyncMetaEntity(
    val userId: String,
    val resourceType: String,
    val lastSyncedAt: String? = null
)
