package com.todowka.app.domain.repository

import com.todowka.app.data.local.db.entity.AreaEntity
import kotlinx.coroutines.flow.Flow

interface AreaRepository {
    fun getAll(userId: String): Flow<List<AreaEntity>>
    fun getById(id: String, userId: String): Flow<AreaEntity?>
    suspend fun createArea(
        userId: String,
        name: String,
        description: String? = null,
        color: String? = null
    ): AreaEntity
    suspend fun updateArea(area: AreaEntity): AreaEntity
    suspend fun deleteArea(areaId: String, userId: String)
}
