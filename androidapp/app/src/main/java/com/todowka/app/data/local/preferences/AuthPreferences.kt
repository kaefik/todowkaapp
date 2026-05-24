package com.todowka.app.data.local.preferences

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class AuthPreferences(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences? = try {
        EncryptedSharedPreferences.create(
            context,
            "auth_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (_: Exception) {
        null
    }

    val accessToken: String?
        get() = safeGet { it.getString("access_token", null) }

    val refreshToken: String?
        get() = safeGet { it.getString("refresh_token", null) }

    val currentUserId: String?
        get() = safeGet { it.getString("current_user_id", null) }

    fun saveTokens(access: String, refresh: String, userId: String) {
        safeEdit { editor ->
            editor.putString("access_token", access)
            editor.putString("refresh_token", refresh)
            editor.putString("current_user_id", userId)
        }
    }

    fun clearTokens() {
        safeEdit { editor ->
            editor.remove("access_token")
            editor.remove("refresh_token")
            editor.remove("current_user_id")
        }
    }

    private fun <T> safeGet(block: (SharedPreferences) -> T): T? {
        return try {
            prefs?.let(block)
        } catch (_: Exception) {
            null
        }
    }

    private fun safeEdit(block: (SharedPreferences.Editor) -> Unit) {
        try {
            prefs?.edit()?.also(block)?.apply()
        } catch (_: Exception) {
            // decryption error (e.g. device lock change)
        }
    }
}
