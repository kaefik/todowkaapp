package com.todowka.app.data.local.db.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "mutations",
    indices = [Index("userId")]
)
data class MutationEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val userId: String,
    val entityType: String,
    val entityId: String,
    val operation: String,
    val payload: String? = null,
    val createdAt: String
)
