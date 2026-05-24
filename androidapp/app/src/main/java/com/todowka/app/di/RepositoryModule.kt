package com.todowka.app.di

import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.data.local.preferences.SyncPreferences
import com.todowka.app.data.local.preferences.UserPreferences
import com.todowka.app.data.repository.AreaRepositoryImpl
import com.todowka.app.data.repository.AuthRepositoryImpl
import com.todowka.app.data.repository.CalendarEventRepositoryImpl
import com.todowka.app.data.repository.ChecklistRepositoryImpl
import com.todowka.app.data.repository.ContextRepositoryImpl
import com.todowka.app.data.repository.NotificationRepositoryImpl
import com.todowka.app.data.repository.ProjectRepositoryImpl
import com.todowka.app.data.repository.ReviewRepositoryImpl
import com.todowka.app.data.repository.TagRepositoryImpl
import com.todowka.app.data.repository.TaskRepositoryImpl
import com.todowka.app.data.repository.VerbTemplateRepositoryImpl
import com.todowka.app.data.sync.SyncEngine
import com.todowka.app.domain.repository.AreaRepository
import com.todowka.app.domain.repository.AuthRepository
import com.todowka.app.domain.repository.CalendarEventRepository
import com.todowka.app.domain.repository.ChecklistRepository
import com.todowka.app.domain.repository.ContextRepository
import com.todowka.app.domain.repository.NotificationRepository
import com.todowka.app.domain.repository.ProjectRepository
import com.todowka.app.domain.repository.ReviewRepository
import com.todowka.app.domain.repository.TagRepository
import com.todowka.app.domain.repository.TaskRepository
import com.todowka.app.domain.repository.VerbTemplateRepository
import org.koin.dsl.module

val repositoryModule = module {
    single { AuthPreferences(get()) }
    single { UserPreferences(get()) }
    single { SyncPreferences(get()) }

    single<AuthRepository> {
        AuthRepositoryImpl(
            authApi = get(),
            authPreferences = get(),
            userPreferences = get(),
            db = get()
        )
    }

    single<TaskRepository> {
        TaskRepositoryImpl(
            taskDao = get(),
            mutationDao = get(),
            tagDao = get()
        )
    }

    single<ProjectRepository> {
        ProjectRepositoryImpl(
            projectDao = get(),
            mutationDao = get()
        )
    }

    single<AreaRepository> {
        AreaRepositoryImpl(
            areaDao = get(),
            mutationDao = get()
        )
    }

    single<ContextRepository> {
        ContextRepositoryImpl(
            contextDao = get(),
            mutationDao = get()
        )
    }

    single<TagRepository> {
        TagRepositoryImpl(
            tagDao = get(),
            mutationDao = get()
        )
    }

    single<CalendarEventRepository> {
        CalendarEventRepositoryImpl(
            calendarEventDao = get(),
            mutationDao = get()
        )
    }

    single<VerbTemplateRepository> {
        VerbTemplateRepositoryImpl(
            verbTemplateDao = get(),
            mutationDao = get()
        )
    }

    single<ChecklistRepository> {
        ChecklistRepositoryImpl(
            checklistItemDao = get(),
            mutationDao = get()
        )
    }

    single<NotificationRepository> {
        NotificationRepositoryImpl(
            notificationsApi = get()
        )
    }

    single<ReviewRepository> {
        ReviewRepositoryImpl(
            reviewApi = get()
        )
    }

    single {
        SyncEngine(
            tasksApi = get(),
            projectsApi = get(),
            areasApi = get(),
            contextsApi = get(),
            tagsApi = get(),
            checklistApi = get(),
            calendarEventsApi = get(),
            verbTemplatesApi = get(),
            authPreferences = get(),
            db = get(),
            taskDao = get(),
            projectDao = get(),
            areaDao = get(),
            contextDao = get(),
            mutationDao = get(),
            syncMetaDao = get(),
            tagDao = get(),
            checklistItemDao = get(),
            calendarEventDao = get(),
            verbTemplateDao = get()
        )
    }
}
