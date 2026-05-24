package com.todowka.app.util

enum class SyncStatus(val value: String) {
    SYNCED("synced"),
    LOCAL("local"),
    MODIFIED("modified"),
    DELETED("deleted")
}
