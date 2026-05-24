package com.todowka.app.data.local.preferences

import android.content.Context
import android.content.SharedPreferences

class ServerPreferences(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("server_prefs", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = prefs.getString("server_url", DEFAULT_URL) ?: DEFAULT_URL
        set(value) = prefs.edit().putString("server_url", value).apply()

    companion object {
        const val DEFAULT_URL = "http://10.0.2.2:8000/"
    }
}
