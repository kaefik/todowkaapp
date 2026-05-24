package com.todowka.app.data.sync

class EchoSuppressor {
    private val pushedIds = mutableMapOf<String, Long>()
    private val TTL = 5000L

    fun markPushed(entityId: String) {
        pushedIds[entityId] = System.currentTimeMillis()
    }

    fun wasRecentlyPushed(entityId: String): Boolean {
        val timestamp = pushedIds[entityId] ?: return false
        return System.currentTimeMillis() - timestamp < TTL
    }

    fun cleanup() {
        val now = System.currentTimeMillis()
        pushedIds.entries.removeAll { now - it.value > TTL }
    }
}
