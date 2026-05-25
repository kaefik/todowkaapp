package com.todowka.app.di

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.todowka.app.data.local.preferences.ServerPreferences
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import kotlin.reflect.KClass

class RetrofitProvider(
    private val serverPreferences: ServerPreferences,
    private val okHttpClient: OkHttpClient,
    private val json: Json
) {
    private val fallbackUrl = ServerPreferences.DEFAULT_URL

    private var currentUrl: String = resolveUrl()
    private var _retrofit: Retrofit? = null
    private val apiCache = mutableMapOf<KClass<*>, Any>()

    private val retrofit: Retrofit
        get() {
            checkRebuild()
            return _retrofit ?: buildRetrofit().also { _retrofit = it }
        }

    @Suppress("UNCHECKED_CAST")
    fun <T : Any> getApi(cls: KClass<T>): T {
        return apiCache.getOrPut(cls) { retrofit.create(cls.java) } as T
    }

    fun rebuild() {
        currentUrl = resolveUrl()
        _retrofit = null
        apiCache.clear()
    }

    private fun checkRebuild() {
        val newUrl = resolveUrl()
        if (newUrl != currentUrl) {
            currentUrl = newUrl
            _retrofit = null
            apiCache.clear()
        }
    }

    private fun resolveUrl(): String {
        val raw = serverPreferences.serverUrl.trim()
        if (raw.isEmpty() || raw == "/") return fallbackUrl
        val normalized = raw.trimEnd('/').removeSuffix("/api").removeSuffix("/api/")
        return ensureTrailingSlash(if (normalized.isEmpty()) raw else normalized)
    }

    private fun buildRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl(currentUrl)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    private fun ensureTrailingSlash(url: String): String {
        return if (url.endsWith("/")) url else "$url/"
    }
}
