package com.todowka.app.di

import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.todowka.app.data.sync.SyncWorker
import org.koin.dsl.module
import java.util.concurrent.TimeUnit

val workerModule = module {
    single {
        val context = get<android.content.Context>()
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "todowka_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
    }
}
