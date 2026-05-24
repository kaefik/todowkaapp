package com.todowka.app.ui.components.calendar

import kotlinx.datetime.LocalDate
import kotlinx.datetime.Month
import kotlinx.datetime.number

data class YearMonth(val year: Int, val month: Month) {
    val monthNumber: Int get() = month.number
    fun atStartOfMonth(): LocalDate = LocalDate(year, month, 1)
}
