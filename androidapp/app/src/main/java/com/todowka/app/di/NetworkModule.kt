package com.todowka.app.di

import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.data.local.preferences.ServerPreferences
import com.todowka.app.data.remote.interceptor.AuthInterceptor
import com.todowka.app.data.remote.interceptor.TokenRefreshInterceptor
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.koin.dsl.module

val networkModule = module {
    single {
        Json {
            ignoreUnknownKeys = true
            isLenient = true
        }
    }

    single {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val authInterceptor = AuthInterceptor(
            getToken = { get<AuthPreferences>().accessToken }
        )

        val tokenRefreshInterceptor = TokenRefreshInterceptor(
            getRefreshToken = { get<AuthPreferences>().refreshToken },
            saveTokens = { access, refresh ->
                val prefs = get<AuthPreferences>()
                val userId = prefs.currentUserId ?: ""
                prefs.saveTokens(access, refresh, userId)
            },
            onLogout = {}
        )

        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(tokenRefreshInterceptor)
            .addInterceptor(loggingInterceptor)
            .build()
    }

    single { RetrofitProvider(get<ServerPreferences>(), get(), get()) }
}
