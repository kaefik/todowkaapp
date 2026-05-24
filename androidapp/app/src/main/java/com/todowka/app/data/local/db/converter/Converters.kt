package com.todowka.app.data.local.db.converter

import androidx.room.TypeConverter
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class Converters {

    private val json = Json { ignoreUnknownKeys = true }

    @TypeConverter
    fun fromStringList(value: List<String>): String {
        return json.encodeToString(value)
    }

    @TypeConverter
    fun toStringList(value: String): List<String> {
        return try {
            json.decodeFromString(value)
        } catch (_: Exception) {
            emptyList()
        }
    }

    @TypeConverter
    fun fromInstant(value: String?): Long? {
        return value?.let {
            try {
                kotlinx.datetime.Instant.parse(it).toEpochMilliseconds()
            } catch (_: Exception) {
                null
            }
        }
    }
}
