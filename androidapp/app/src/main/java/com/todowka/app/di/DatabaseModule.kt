package com.todowka.app.di

import androidx.room.Room
import com.todowka.app.data.local.db.TodowkaDatabase
import org.koin.dsl.module

val databaseModule = module {
    single {
        Room.databaseBuilder(
            get(),
            TodowkaDatabase::class.java,
            "todowka.db"
        ).build()
    }

    single { get<TodowkaDatabase>().taskDao() }
    single { get<TodowkaDatabase>().projectDao() }
    single { get<TodowkaDatabase>().areaDao() }
    single { get<TodowkaDatabase>().contextDao() }
    single { get<TodowkaDatabase>().tagDao() }
    single { get<TodowkaDatabase>().checklistItemDao() }
    single { get<TodowkaDatabase>().calendarEventDao() }
    single { get<TodowkaDatabase>().verbTemplateDao() }
    single { get<TodowkaDatabase>().mutationDao() }
    single { get<TodowkaDatabase>().syncMetaDao() }
}
