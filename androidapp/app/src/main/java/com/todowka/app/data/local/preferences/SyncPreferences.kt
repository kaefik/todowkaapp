package com.todowka.app.data.local.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.syncDataStore: DataStore<Preferences> by preferencesDataStore(name = "sync_prefs")

class SyncPreferences(context: Context) {

    private val dataStore = context.syncDataStore

    val lastFullSyncAt: Flow<String?> = dataStore.data.map { prefs ->
        prefs[LAST_FULL_SYNC_AT]
    }

    val syncIntervalMinutes: Flow<Int> = dataStore.data.map { prefs ->
        prefs[SYNC_INTERVAL_MINUTES] ?: 15
    }

    val isSyncEnabled: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[IS_SYNC_ENABLED] ?: true
    }

    suspend fun setLastFullSyncAt(value: String?) {
        dataStore.edit { prefs ->
            if (value != null) prefs[LAST_FULL_SYNC_AT] = value
            else prefs.remove(LAST_FULL_SYNC_AT)
        }
    }

    suspend fun setSyncIntervalMinutes(value: Int) {
        dataStore.edit { it[SYNC_INTERVAL_MINUTES] = value }
    }

    suspend fun setSyncEnabled(value: Boolean) {
        dataStore.edit { it[IS_SYNC_ENABLED] = value }
    }

    companion object {
        private val LAST_FULL_SYNC_AT = stringPreferencesKey("last_full_sync_at")
        private val SYNC_INTERVAL_MINUTES = intPreferencesKey("sync_interval_minutes")
        private val IS_SYNC_ENABLED = booleanPreferencesKey("is_sync_enabled")
    }
}
