package com.todowka.app

import android.app.Application
import com.todowka.app.di.appModule
import com.todowka.app.di.databaseModule
import com.todowka.app.di.networkModule
import com.todowka.app.di.repositoryModule
import com.todowka.app.di.viewModelModule
import com.todowka.app.di.workerModule
import org.koin.android.ext.koin.androidContext
import org.koin.android.ext.koin.androidLogger
import org.koin.core.context.startKoin

class TodowkaApp : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidLogger()
            androidContext(this@TodowkaApp)
            modules(
                appModule,
                networkModule,
                databaseModule,
                repositoryModule,
                viewModelModule,
                workerModule
            )
        }
    }
}
