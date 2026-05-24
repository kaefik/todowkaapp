package com.todowka.app.di

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.data.remote.api.AreasApi
import com.todowka.app.data.remote.api.AuthApi
import com.todowka.app.data.remote.api.BackupScheduleApi
import com.todowka.app.data.remote.api.CalendarEventsApi
import com.todowka.app.data.remote.api.ChecklistApi
import com.todowka.app.data.remote.api.ConfigApi
import com.todowka.app.data.remote.api.ContextsApi
import com.todowka.app.data.remote.api.DevicesApi
import com.todowka.app.data.remote.api.ExportImportApi
import com.todowka.app.data.remote.api.NotificationsApi
import com.todowka.app.data.remote.api.ProjectsApi
import com.todowka.app.data.remote.api.ReviewApi
import com.todowka.app.data.remote.api.SessionsApi
import com.todowka.app.data.remote.api.TagsApi
import com.todowka.app.data.remote.api.TasksApi
import com.todowka.app.data.remote.api.TelegramApi
import com.todowka.app.data.remote.api.UsersApi
import com.todowka.app.data.remote.api.VerbTemplatesApi
import com.todowka.app.data.remote.interceptor.AuthInterceptor
import com.todowka.app.data.remote.interceptor.TokenRefreshInterceptor
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.koin.dsl.module
import retrofit2.Retrofit

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

    single {
        val baseUrl = "http://10.0.2.2:8000/"
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(get())
            .addConverterFactory(get<Json>().asConverterFactory("application/json".toMediaType()))
            .build()
    }

    single<AuthApi> { get<Retrofit>().create(AuthApi::class.java) }
    single<TasksApi> { get<Retrofit>().create(TasksApi::class.java) }
    single<ProjectsApi> { get<Retrofit>().create(ProjectsApi::class.java) }
    single<AreasApi> { get<Retrofit>().create(AreasApi::class.java) }
    single<ContextsApi> { get<Retrofit>().create(ContextsApi::class.java) }
    single<TagsApi> { get<Retrofit>().create(TagsApi::class.java) }
    single<CalendarEventsApi> { get<Retrofit>().create(CalendarEventsApi::class.java) }
    single<ChecklistApi> { get<Retrofit>().create(ChecklistApi::class.java) }
    single<NotificationsApi> { get<Retrofit>().create(NotificationsApi::class.java) }
    single<ReviewApi> { get<Retrofit>().create(ReviewApi::class.java) }
    single<UsersApi> { get<Retrofit>().create(UsersApi::class.java) }
    single<SessionsApi> { get<Retrofit>().create(SessionsApi::class.java) }
    single<VerbTemplatesApi> { get<Retrofit>().create(VerbTemplatesApi::class.java) }
    single<ConfigApi> { get<Retrofit>().create(ConfigApi::class.java) }
    single<DevicesApi> { get<Retrofit>().create(DevicesApi::class.java) }
    single<TelegramApi> { get<Retrofit>().create(TelegramApi::class.java) }
    single<ExportImportApi> { get<Retrofit>().create(ExportImportApi::class.java) }
    single<BackupScheduleApi> { get<Retrofit>().create(BackupScheduleApi::class.java) }
}
