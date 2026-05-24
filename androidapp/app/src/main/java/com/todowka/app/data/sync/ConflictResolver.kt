package com.todowka.app.data.sync

object ConflictResolver {
    fun <T> resolve(local: T, remote: T, getUpdatedAt: (T) -> String): T {
        val localUpdated = getUpdatedAt(local)
        val remoteUpdated = getUpdatedAt(remote)
        return if (remoteUpdated >= localUpdated) remote else local
    }
}
