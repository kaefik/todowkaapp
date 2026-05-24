package com.todowka.app.data.local.db.converter

import androidx.room.TypeConverter
import com.todowka.app.util.SyncStatus

class SyncStatusConverter {

    @TypeConverter
    fun fromSyncStatus(status: SyncStatus): String {
        return status.value
    }

    @TypeConverter
    fun toSyncStatus(value: String): SyncStatus {
        return SyncStatus.entries.find { it.value == value } ?: SyncStatus.LOCAL
    }
}
