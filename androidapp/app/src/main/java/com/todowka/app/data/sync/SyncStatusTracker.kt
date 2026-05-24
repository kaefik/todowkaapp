package com.todowka.app.data.sync

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SyncStatusTracker {
    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _lastSyncAt = MutableStateFlow<String?>(null)
    val lastSyncAt: StateFlow<String?> = _lastSyncAt.asStateFlow()

    private val _syncError = MutableStateFlow<String?>(null)
    val syncError: StateFlow<String?> = _syncError.asStateFlow()

    fun startSync() {
        _isSyncing.value = true
        _syncError.value = null
    }

    fun finishSync() {
        _isSyncing.value = false
        _lastSyncAt.value = com.todowka.app.util.DateTimeUtils.nowIso()
    }

    fun setError(message: String) {
        _isSyncing.value = false
        _syncError.value = message
    }
}
