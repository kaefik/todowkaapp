package com.todowka.app.util

import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.plus
import kotlinx.datetime.toLocalDateTime

object DateTimeUtils {

    fun nowIso(): String = Clock.System.now().toString()

    fun todayIso(): String = Clock.System.now()
        .toLocalDateTime(TimeZone.currentSystemDefault())
        .date.toString()

    fun formatDate(iso: String): String {
        return try {
            val instant = Instant.parse(iso)
            val local = instant.toLocalDateTime(TimeZone.currentSystemDefault())
            "${local.dayOfMonth.toString().padStart(2, '0')}.${local.monthNumber.toString().padStart(2, '0')}.${local.year}"
        } catch (_: Exception) {
            iso
        }
    }

    fun isToday(iso: String): Boolean {
        return try {
            val date = parseLocalDate(iso)
            date == LocalDate.Companion.parse(todayIso())
        } catch (_: Exception) {
            false
        }
    }

    fun isTomorrow(iso: String): Boolean {
        return try {
            val date = parseLocalDate(iso)
            val tomorrow = LocalDate.Companion.parse(todayIso()).plus(1, DateTimeUnit.DAY)
            date == tomorrow
        } catch (_: Exception) {
            false
        }
    }

    fun isOverdue(iso: String): Boolean {
        return try {
            val date = parseLocalDate(iso)
            date < LocalDate.Companion.parse(todayIso())
        } catch (_: Exception) {
            false
        }
    }

    private fun parseLocalDate(iso: String): LocalDate {
        return try {
            val instant = Instant.parse(iso)
            instant.toLocalDateTime(TimeZone.currentSystemDefault()).date
        } catch (_: Exception) {
            LocalDate.Companion.parse(iso.take(10))
        }
    }
}
