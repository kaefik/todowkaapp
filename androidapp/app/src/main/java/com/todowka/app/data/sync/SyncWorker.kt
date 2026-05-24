package com.todowka.app.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.todowka.app.data.local.preferences.AuthPreferences
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params), KoinComponent {

    private val syncEngine: SyncEngine by inject()
    private val authPreferences: AuthPreferences by inject()

    override suspend fun doWork(): Result {
        val userId = authPreferences.currentUserId ?: return Result.failure()
        return try {
            syncEngine.fullSync(userId)
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry()
            else Result.failure()
        }
    }
}
