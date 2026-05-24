package com.todowka.app.data.local.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.userDataStore: DataStore<Preferences> by preferencesDataStore(name = "user_prefs")

class UserPreferences(context: Context) {

    private val dataStore = context.userDataStore

    val isDarkMode: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[IS_DARK_MODE] ?: false
    }

    val language: Flow<String> = dataStore.data.map { prefs ->
        prefs[LANGUAGE] ?: "ru"
    }

    val defaultSection: Flow<String> = dataStore.data.map { prefs ->
        prefs[DEFAULT_SECTION] ?: "inbox"
    }

    val isOnboarded: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[IS_ONBOARDED] ?: false
    }

    suspend fun setDarkMode(value: Boolean) {
        dataStore.edit { it[IS_DARK_MODE] = value }
    }

    suspend fun setLanguage(value: String) {
        dataStore.edit { it[LANGUAGE] = value }
    }

    suspend fun setDefaultSection(value: String) {
        dataStore.edit { it[DEFAULT_SECTION] = value }
    }

    suspend fun setOnboarded(value: Boolean) {
        dataStore.edit { it[IS_ONBOARDED] = value }
    }

    companion object {
        private val IS_DARK_MODE = booleanPreferencesKey("is_dark_mode")
        private val LANGUAGE = stringPreferencesKey("language")
        private val DEFAULT_SECTION = stringPreferencesKey("default_section")
        private val IS_ONBOARDED = booleanPreferencesKey("is_onboarded")
    }
}
