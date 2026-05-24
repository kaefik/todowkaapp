package com.todowka.app.data.sync

import android.util.Log
import com.todowka.app.data.local.db.TodowkaDatabase
import com.todowka.app.data.local.db.dao.AreaDao
import com.todowka.app.data.local.db.dao.CalendarEventDao
import com.todowka.app.data.local.db.dao.ChecklistItemDao
import com.todowka.app.data.local.db.dao.ContextDao
import com.todowka.app.data.local.db.dao.MutationDao
import com.todowka.app.data.local.db.dao.ProjectDao
import com.todowka.app.data.local.db.dao.SyncMetaDao
import com.todowka.app.data.local.db.dao.TagDao
import com.todowka.app.data.local.db.dao.TaskDao
import com.todowka.app.data.local.db.dao.VerbTemplateDao
import com.todowka.app.data.local.db.entity.AreaEntity
import com.todowka.app.data.local.db.entity.CalendarEventEntity
import com.todowka.app.data.local.db.entity.ChecklistItemEntity
import com.todowka.app.data.local.db.entity.ContextEntity
import com.todowka.app.data.local.db.entity.ProjectEntity
import com.todowka.app.data.local.db.entity.SyncMetaEntity
import com.todowka.app.data.local.db.entity.TagEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.data.local.db.entity.TaskTagCrossRef
import com.todowka.app.data.local.db.entity.VerbTemplateEntity
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.data.remote.api.AreasApi
import com.todowka.app.data.remote.api.CalendarEventsApi
import com.todowka.app.data.remote.api.ChecklistApi
import com.todowka.app.data.remote.api.ContextsApi
import com.todowka.app.data.remote.api.ProjectsApi
import com.todowka.app.data.remote.api.TagsApi
import com.todowka.app.data.remote.api.TasksApi
import com.todowka.app.data.remote.api.VerbTemplatesApi
import com.todowka.app.data.remote.dto.request.TaskCreateRequest
import com.todowka.app.data.remote.dto.request.TaskMoveRequest
import com.todowka.app.data.remote.dto.request.TaskReorderRequest
import com.todowka.app.data.remote.dto.request.TaskUpdateRequest
import com.todowka.app.util.DateTimeUtils
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.Json

class SyncEngine(
    private val tasksApi: TasksApi,
    private val projectsApi: ProjectsApi,
    private val areasApi: AreasApi,
    private val contextsApi: ContextsApi,
    private val tagsApi: TagsApi,
    private val checklistApi: ChecklistApi,
    private val calendarEventsApi: CalendarEventsApi,
    private val verbTemplatesApi: VerbTemplatesApi,
    private val authPreferences: AuthPreferences,
    private val db: TodowkaDatabase,
    private val taskDao: TaskDao,
    private val projectDao: ProjectDao,
    private val areaDao: AreaDao,
    private val contextDao: ContextDao,
    private val mutationDao: MutationDao,
    private val syncMetaDao: SyncMetaDao,
    private val tagDao: TagDao,
    private val checklistItemDao: ChecklistItemDao,
    private val calendarEventDao: CalendarEventDao,
    private val verbTemplateDao: VerbTemplateDao
) {
    private val mutex = Mutex()
    private val echoSuppressor = EchoSuppressor()
    val statusTracker = SyncStatusTracker()

    private val _syncStatus = MutableStateFlow(SyncState("idle"))
    val syncStatus: StateFlow<SyncState> = _syncStatus.asStateFlow()

    data class SyncState(val status: String, val message: String = "")

    suspend fun performInitialSync(userId: String) {
        val acquired = mutex.tryLock()
        if (!acquired) {
            withTimeoutOrNull(60_000L) { mutex.lock() } ?: return
        }
        try {
            _syncStatus.value = SyncState("syncing", "Initial sync")
            statusTracker.startSync()

            taskDao.deleteByUserId(userId)
            projectDao.deleteByUserId(userId)
            areaDao.deleteByUserId(userId)
            contextDao.deleteByUserId(userId)
            tagDao.deleteByUserId(userId)
            checklistItemDao.deleteByUserId(userId)
            calendarEventDao.deleteByUserId(userId)
            verbTemplateDao.deleteByUserId(userId)

            val now = DateTimeUtils.nowIso()

            coroutineScope {
                val tasksDeferred = async {
                    runCatching { tasksApi.getTasks(limit = 10000) }.getOrNull()?.body()
                }
                val projectsDeferred = async {
                    runCatching { projectsApi.getProjects(limit = 10000) }.getOrNull()?.body()
                }
                val areasDeferred = async {
                    runCatching { areasApi.getAreas(limit = 10000) }.getOrNull()?.body()
                }
                val contextsDeferred = async {
                    runCatching { contextsApi.getContexts() }.getOrNull()?.body()
                }
                val tagsDeferred = async {
                    runCatching { tagsApi.getTags() }.getOrNull()?.body()
                }
                val checklistDeferred = async {
                    runCatching { checklistApi.getAllChecklistItems() }.getOrNull()?.body()
                }
                val eventsDeferred = async {
                    runCatching { calendarEventsApi.getEvents(limit = 10000) }.getOrNull()?.body()
                }
                val verbsDeferred = async {
                    runCatching { verbTemplatesApi.getTemplates() }.getOrNull()?.body()
                }

                tasksDeferred.await()?.let { resp ->
                    taskDao.upsertAll(resp.items.map { it.toEntity() })
                }
                projectsDeferred.await()?.let { resp ->
                    projectDao.upsertAll(resp.items.map { it.toEntity() })
                }
                areasDeferred.await()?.let { resp ->
                    areaDao.upsertAll(resp.items.map { it.toEntity() })
                }
                contextsDeferred.await()?.let { resp ->
                    contextDao.upsertAll(resp.items.map { it.toEntity() })
                }
                tagsDeferred.await()?.let { resp ->
                    tagDao.upsertAll(resp.items.map { it.toEntity() })
                }
                checklistDeferred.await()?.let { resp ->
                    checklistItemDao.upsertAll(resp.items.map {
                        ChecklistItemEntity(
                            id = it.id,
                            userId = userId,
                            taskId = it.taskId,
                            title = it.title,
                            isCompleted = it.isCompleted,
                            position = it.position,
                            completedAt = it.completedAt,
                            createdAt = it.createdAt,
                            updatedAt = it.updatedAt,
                            _syncStatus = "synced",
                            _lastSyncedAt = now
                        )
                    })
                }
                eventsDeferred.await()?.let { resp ->
                    calendarEventDao.upsertAll(resp.items.map { it.toEntity(userId) })
                }
                verbsDeferred.await()?.let { resp ->
                    verbTemplateDao.upsertAll(resp.items.map { it.toEntity(userId) })
                }
            }

            val resourceTypes = listOf(
                "task", "project", "area", "context", "tag",
                "checklist_item", "calendar_event", "verb_template"
            )
            resourceTypes.forEach { type ->
                syncMetaDao.upsert(SyncMetaEntity(userId, type, now))
            }

            statusTracker.finishSync()
            _syncStatus.value = SyncState("idle")
        } catch (e: Exception) {
            Log.e("SyncEngine", "Initial sync failed", e)
            statusTracker.setError(e.message ?: "Unknown error")
            _syncStatus.value = SyncState("error", e.message ?: "Unknown error")
        } finally {
            mutex.unlock()
        }
    }

    suspend fun pushPendingChanges(userId: String) {
        if (!mutex.tryLock()) return
        try {
            _syncStatus.value = SyncState("syncing", "Pushing changes")
            statusTracker.startSync()

            val mutations = mutationDao.getPendingByUserIdSync(userId)
            mutations.forEach { mutation ->
                val success = pushMutation(mutation, userId)
                if (success) {
                    mutationDao.deleteById(mutation.id)
                    echoSuppressor.markPushed(mutation.entityId)
                }
            }

            echoSuppressor.cleanup()
            statusTracker.finishSync()
            _syncStatus.value = SyncState("idle")
        } catch (e: Exception) {
            Log.e("SyncEngine", "Push failed", e)
            statusTracker.setError(e.message ?: "Unknown error")
            _syncStatus.value = SyncState("error", e.message ?: "Unknown error")
        } finally {
            mutex.unlock()
        }
    }

    private suspend fun pushMutation(mutation: com.todowka.app.data.local.db.entity.MutationEntity, userId: String): Boolean {
        return try {
            when (mutation.entityType) {
                "task" -> pushTaskMutation(mutation, userId)
                "project" -> pushProjectMutation(mutation, userId)
                "area" -> pushAreaMutation(mutation, userId)
                "context" -> pushContextMutation(mutation, userId)
                "tag" -> pushTagMutation(mutation, userId)
                "calendar_event" -> pushCalendarEventMutation(mutation, userId)
                "verb_template" -> pushVerbTemplateMutation(mutation, userId)
                "checklist_item" -> pushChecklistMutation(mutation, userId)
                else -> true
            }
        } catch (e: Exception) {
            Log.w("SyncEngine", "Push mutation failed: ${mutation.operation}/${mutation.entityType}/${mutation.entityId}", e)
            false
        }
    }

    private suspend fun retryWithBackoff(block: suspend () -> Boolean): Boolean {
        val delays = listOf(1000L, 2000L, 4000L)
        repeat(3) { attempt ->
            try {
                if (block()) return true
            } catch (e: Exception) {
                if (attempt < 2) delay(delays[attempt])
            }
        }
        return false
    }

    private suspend fun pushTaskMutation(mutation: com.todowka.app.data.local.db.entity.MutationEntity, userId: String): Boolean {
        return retryWithBackoff {
            when (mutation.operation) {
                "create" -> {
                    val task = taskDao.getByIdSync(mutation.entityId) ?: return@retryWithBackoff true
                    val response = tasksApi.createTask(
                        TaskCreateRequest(
                            id = task.id,
                            title = task.title,
                            description = task.description,
                            gtdStatus = task.gtdStatus,
                            contextId = task.contextId,
                            areaId = task.areaId,
                            projectId = task.projectId,
                            dueDate = task.dueDate,
                            notes = task.notes,
                            recurrenceType = task.recurrenceType,
                            recurrenceConfig = task.recurrenceConfig,
                            recurrenceEndDate = task.recurrenceEndDate,
                            reminderTime = task.reminderTime
                        )
                    )
                    if (response.isSuccessful) {
                        taskDao.updateSyncStatus(task.id, "synced", DateTimeUtils.nowIso())
                        true
                    } else if (response.code() == 404) true
                    else false
                }
                "update" -> {
                    val task = taskDao.getByIdSync(mutation.entityId) ?: return@retryWithBackoff true
                    val response = tasksApi.updateTask(
                        task.id,
                        TaskUpdateRequest(
                            title = task.title,
                            description = task.description,
                            isCompleted = task.isCompleted,
                            gtdStatus = task.gtdStatus,
                            contextId = task.contextId,
                            areaId = task.areaId,
                            projectId = task.projectId,
                            dueDate = task.dueDate,
                            notes = task.notes,
                            recurrenceType = task.recurrenceType,
                            recurrenceConfig = task.recurrenceConfig,
                            recurrenceEndDate = task.recurrenceEndDate,
                            reminderTime = task.reminderTime
                        )
                    )
                    if (response.isSuccessful) {
                        taskDao.updateSyncStatus(task.id, "synced", DateTimeUtils.nowIso())
                        true
                    } else if (response.code() == 404) true
                    else if (response.code() == 409) {
                        response.body()?.let { taskDao.upsert(it.toEntity()) }
                        true
                    } else false
                }
                "toggle" -> {
                    val response = tasksApi.toggleTask(mutation.entityId)
                    if (response.isSuccessful) {
                        response.body()?.let { taskDao.upsert(it.toEntity()) }
                        true
                    } else if (response.code() == 404) true
                    else false
                }
                "move" -> {
                    val payload = mutation.payload
                    val newStatus = if (payload != null) {
                        try { Json.decodeFromString<Map<String, String>>(payload)["gtd_status"] } catch (_: Exception) { null }
                    } else null
                    val response = tasksApi.moveTask(mutation.entityId, TaskMoveRequest(newStatus ?: "inbox"))
                    if (response.isSuccessful) {
                        response.body()?.let { taskDao.upsert(it.toEntity()) }
                        true
                    } else if (response.code() == 404) true
                    else false
                }
                "reorder" -> {
                    val payload = mutation.payload
                    val position = if (payload != null) {
                        try { Json.decodeFromString<Map<String, Int>>(payload)["position"] } catch (_: Exception) { null }
                    } else null
                    val response = tasksApi.reorderTask(mutation.entityId, TaskReorderRequest(position ?: 0))
                    if (response.isSuccessful) {
                        taskDao.updateSyncStatus(mutation.entityId, "synced", DateTimeUtils.nowIso())
                        true
                    } else if (response.code() == 404) true
                    else false
                }
                "delete" -> {
                    val response = tasksApi.deleteTask(mutation.entityId)
                    response.isSuccessful || response.code() == 404
                }
                else -> true
            }
        }
    }

    private suspend fun pushProjectMutation(mutation: com.todowka.app.data.local.db.entity.MutationEntity, userId: String): Boolean {
        return retryWithBackoff {
            when (mutation.operation) {
                "create" -> {
                    val project = projectDao.getByIdSync(mutation.entityId) ?: return@retryWithBackoff true
                    val response = projectsApi.createProject(
                        com.todowka.app.data.remote.dto.request.ProjectCreateRequest(
                            id = project.id,
                            name = project.name,
                            description = project.description,
                            color = project.color,
                            areaId = project.areaId
                        )
                    )
                    if (response.isSuccessful) {
                        projectDao.upsert(project.copy(_syncStatus = "synced", _lastSyncedAt = DateTimeUtils.nowIso()))
                        true
                    } else if (response.code() == 404) true
                    else false
                }
                "update" -> {
                    val project = projectDao.getByIdSync(mutation.entityId) ?: return@retryWithBackoff true
                    val response = projectsApi.updateProject(
                        project.id,
                        com.todowka.app.data.remote.dto.request.ProjectUpdateRequest(
                            name = project.name,
                            description = project.description,
                            color = project.color,
                            areaId = project.areaId,
                            isActive = project.isActive
                        )
                    )
                    if (response.isSuccessful) {
                        projectDao.upsert(project.copy(_syncStatus = "synced", _lastSyncedAt = DateTimeUtils.nowIso()))
                        true
                    } else if (response.code() == 404) true
                    else false
                }
                "delete" -> {
                    val response = projectsApi.deleteProject(mutation.entityId)
                    response.isSuccessful || response.code() == 404
                }
                else -> true
            }
        }
    }

    private suspend fun pushAreaMutation(mutation: com.todowka.app.data.local.db.entity.MutationEntity, userId: String): Boolean {
        return retryWithBackoff {
            when (mutation.operation) {
                "create" -> {
                    val area = areaDao.getByIdSync(mutation.entityId) ?: return@retryWithBackoff true
                    val response = areasApi.createArea(
                        com.todowka.app.data.remote.dto.request.AreaCreateRequest(
                            id = area.id,
                            name = area.name,
                            description = area.description,
                            color = area.color
                        )
                    )
                    if (response.isSuccessful) {
                        areaDao.upsert(area.copy(_syncStatus = "synced", _lastSyncedAt = DateTimeUtils.nowIso()))
                        true
                    } else if (response.code() == 404) true
                    else false
                }
                "update" -> {
                    val area = areaDao.getByIdSync(mutation.entityId) ?: return@retryWithBackoff true
                    val response = areasApi.updateArea(
                        area.id,
                        com.todowka.app.data.remote.dto.request.AreaUpdateRequest(
                            name = area.name,
                            description = area.description,
                            color = area.color
                        )
                    )
                    if (response.isSuccessful) {
                        areaDao.upsert(area.copy(_syncStatus = "synced", _lastSyncedAt = DateTimeUtils.nowIso()))
                        true
                    } else if (response.code() == 404) true
                    else false
                }
                "delete" -> {
                    val response = areasApi.deleteArea(mutation.entityId)
                    response.isSuccessful || response.code() == 404
                }
                else -> true
            }
        }
    }

    private suspend fun pushContextMutation(mutation: com.todowka.app.data.local.db.entity.MutationEntity, userId: String): Boolean {
        return retryWithBackoff {
            when (mutation.operation) {
                "create" -> {
                    val response = contextsApi.createContext(
                        com.todowka.app.data.remote.dto.request.ContextCreateRequest(
                            id = mutation.entityId,
                            name = mutation.payload ?: ""
                        )
                    )
                    response.isSuccessful || response.code() == 404
                }
                "update" -> {
                    val response = contextsApi.updateContext(
                        mutation.entityId,
                        com.todowka.app.data.remote.dto.request.ContextUpdateRequest()
                    )
                    response.isSuccessful || response.code() == 404
                }
                "delete" -> {
                    val response = contextsApi.deleteContext(mutation.entityId)
                    response.isSuccessful || response.code() == 404
                }
                else -> true
            }
        }
    }

    private suspend fun pushTagMutation(mutation: com.todowka.app.data.local.db.entity.MutationEntity, userId: String): Boolean {
        return retryWithBackoff {
            when (mutation.operation) {
                "create" -> {
                    val response = tagsApi.createTag(
                        com.todowka.app.data.remote.dto.request.TagCreateRequest(
                            id = mutation.entityId,
                            name = mutation.payload ?: ""
                        )
                    )
                    response.isSuccessful || response.code() == 404
                }
                "update" -> {
                    val response = tagsApi.updateTag(
                        mutation.entityId,
                        com.todowka.app.data.remote.dto.request.TagUpdateRequest()
                    )
                    response.isSuccessful || response.code() == 404
                }
                "delete" -> {
                    val response = tagsApi.deleteTag(mutation.entityId)
                    response.isSuccessful || response.code() == 404
                }
                else -> true
            }
        }
    }

    private suspend fun pushCalendarEventMutation(mutation: com.todowka.app.data.local.db.entity.MutationEntity, userId: String): Boolean {
        return retryWithBackoff {
            when (mutation.operation) {
                "create" -> {
                    val response = calendarEventsApi.createEvent(
                        com.todowka.app.data.remote.dto.request.CalendarEventCreateRequest(
                            id = mutation.entityId,
                            title = mutation.payload ?: "",
                            startTime = DateTimeUtils.nowIso()
                        )
                    )
                    response.isSuccessful || response.code() == 404
                }
                "update" -> {
                    val response = calendarEventsApi.updateEvent(
                        mutation.entityId,
                        com.todowka.app.data.remote.dto.request.CalendarEventUpdateRequest()
                    )
                    response.isSuccessful || response.code() == 404
                }
                "delete" -> {
                    val response = calendarEventsApi.deleteEvent(mutation.entityId)
                    response.isSuccessful || response.code() == 404
                }
                else -> true
            }
        }
    }

    private suspend fun pushVerbTemplateMutation(mutation: com.todowka.app.data.local.db.entity.MutationEntity, userId: String): Boolean {
        return retryWithBackoff {
            when (mutation.operation) {
                "create" -> {
                    val response = verbTemplatesApi.createTemplate(
                        com.todowka.app.data.remote.dto.request.VerbTemplateCreateRequest(
                            id = mutation.entityId,
                            text = mutation.payload ?: "",
                            icon = "default"
                        )
                    )
                    response.isSuccessful || response.code() == 404
                }
                "update" -> {
                    val response = verbTemplatesApi.updateTemplate(
                        mutation.entityId,
                        com.todowka.app.data.remote.dto.request.VerbTemplateUpdateRequest()
                    )
                    response.isSuccessful || response.code() == 404
                }
                "delete" -> {
                    val response = verbTemplatesApi.deleteTemplate(mutation.entityId)
                    response.isSuccessful || response.code() == 404
                }
                else -> true
            }
        }
    }

    private suspend fun pushChecklistMutation(mutation: com.todowka.app.data.local.db.entity.MutationEntity, userId: String): Boolean {
        return retryWithBackoff {
            val taskId = try {
                mutation.payload?.let { Json.decodeFromString<Map<String, String>>(it)["task_id"] }
            } catch (_: Exception) { null } ?: return@retryWithBackoff true

            when (mutation.operation) {
                "create" -> {
                    val response = checklistApi.createChecklistItem(
                        taskId,
                        com.todowka.app.data.remote.dto.request.ChecklistItemCreateRequest(
                            id = mutation.entityId,
                            title = ""
                        )
                    )
                    response.isSuccessful || response.code() == 404
                }
                "update" -> {
                    val response = checklistApi.updateChecklistItem(
                        taskId,
                        mutation.entityId,
                        com.todowka.app.data.remote.dto.request.ChecklistItemUpdateRequest()
                    )
                    response.isSuccessful || response.code() == 404
                }
                "delete" -> {
                    val response = checklistApi.deleteChecklistItem(taskId, mutation.entityId)
                    response.isSuccessful || response.code() == 404
                }
                else -> true
            }
        }
    }

    suspend fun pullRemoteChanges(userId: String) {
        if (!mutex.tryLock()) return
        try {
            _syncStatus.value = SyncState("syncing", "Pulling changes")
            statusTracker.startSync()
            val now = DateTimeUtils.nowIso()

            val taskSync = syncMetaDao.get(userId, "task")
            val taskSince = taskSync?.lastSyncedAt
            if (taskSince != null) {
                val response = tasksApi.getTasks(updatedSince = taskSince, limit = 10000)
                if (response.isSuccessful) {
                    response.body()?.items?.forEach { task ->
                        if (!echoSuppressor.wasRecentlyPushed(task.id)) {
                            taskDao.upsert(task.toEntity())
                        }
                    }
                }
            }
            syncMetaDao.upsert(SyncMetaEntity(userId, "task", now))

            val projectSync = syncMetaDao.get(userId, "project")
            val projectSince = projectSync?.lastSyncedAt
            if (projectSince != null) {
                val response = projectsApi.getProjects(updatedSince = projectSince, limit = 10000)
                if (response.isSuccessful) {
                    response.body()?.items?.forEach { project ->
                        if (!echoSuppressor.wasRecentlyPushed(project.id)) {
                            projectDao.upsert(project.toEntity())
                        }
                    }
                }
            }
            syncMetaDao.upsert(SyncMetaEntity(userId, "project", now))

            val areaSync = syncMetaDao.get(userId, "area")
            val areaSince = areaSync?.lastSyncedAt
            if (areaSince != null) {
                val response = areasApi.getAreas(updatedSince = areaSince, limit = 10000)
                if (response.isSuccessful) {
                    response.body()?.items?.forEach { area ->
                        if (!echoSuppressor.wasRecentlyPushed(area.id)) {
                            areaDao.upsert(area.toEntity())
                        }
                    }
                }
            }
            syncMetaDao.upsert(SyncMetaEntity(userId, "area", now))

            val contextSync = syncMetaDao.get(userId, "context")
            val contextSince = contextSync?.lastSyncedAt
            if (contextSince != null) {
                val response = contextsApi.getContexts(updatedSince = contextSince)
                if (response.isSuccessful) {
                    response.body()?.items?.forEach { context ->
                        if (!echoSuppressor.wasRecentlyPushed(context.id)) {
                            contextDao.upsert(context.toEntity())
                        }
                    }
                }
            }
            syncMetaDao.upsert(SyncMetaEntity(userId, "context", now))

            val tagSync = syncMetaDao.get(userId, "tag")
            val tagSince = tagSync?.lastSyncedAt
            if (tagSince != null) {
                val response = tagsApi.getTags(updatedSince = tagSince)
                if (response.isSuccessful) {
                    response.body()?.items?.forEach { tag ->
                        if (!echoSuppressor.wasRecentlyPushed(tag.id)) {
                            tagDao.upsert(tag.toEntity())
                        }
                    }
                }
            }
            syncMetaDao.upsert(SyncMetaEntity(userId, "tag", now))

            val checklistSync = syncMetaDao.get(userId, "checklist_item")
            val checklistSince = checklistSync?.lastSyncedAt
            if (checklistSince != null) {
                val response = checklistApi.getAllChecklistItems(updatedSince = checklistSince)
                if (response.isSuccessful) {
                    response.body()?.items?.forEach { item ->
                        if (!echoSuppressor.wasRecentlyPushed(item.id)) {
                            checklistItemDao.upsert(
                                ChecklistItemEntity(
                                    id = item.id,
                                    userId = userId,
                                    taskId = item.taskId,
                                    title = item.title,
                                    isCompleted = item.isCompleted,
                                    position = item.position,
                                    completedAt = item.completedAt,
                                    createdAt = item.createdAt,
                                    updatedAt = item.updatedAt,
                                    _syncStatus = "synced",
                                    _lastSyncedAt = now
                                )
                            )
                        }
                    }
                }
            }
            syncMetaDao.upsert(SyncMetaEntity(userId, "checklist_item", now))

            val eventSync = syncMetaDao.get(userId, "calendar_event")
            val eventSince = eventSync?.lastSyncedAt
            if (eventSince != null) {
                val response = calendarEventsApi.getEvents(updatedSince = eventSince, limit = 10000)
                if (response.isSuccessful) {
                    response.body()?.items?.forEach { event ->
                        if (!echoSuppressor.wasRecentlyPushed(event.id)) {
                            calendarEventDao.upsert(event.toEntity(userId))
                        }
                    }
                }
            }
            syncMetaDao.upsert(SyncMetaEntity(userId, "calendar_event", now))

            val verbSync = syncMetaDao.get(userId, "verb_template")
            val verbSince = verbSync?.lastSyncedAt
            if (verbSince != null) {
                val response = verbTemplatesApi.getTemplates()
                if (response.isSuccessful) {
                    response.body()?.items?.forEach { template ->
                        if (!echoSuppressor.wasRecentlyPushed(template.id)) {
                            verbTemplateDao.upsert(template.toEntity(userId))
                        }
                    }
                }
            }
            syncMetaDao.upsert(SyncMetaEntity(userId, "verb_template", now))

            echoSuppressor.cleanup()
            statusTracker.finishSync()
            _syncStatus.value = SyncState("idle")
        } catch (e: Exception) {
            Log.e("SyncEngine", "Pull failed", e)
            statusTracker.setError(e.message ?: "Unknown error")
            _syncStatus.value = SyncState("error", e.message ?: "Unknown error")
        } finally {
            mutex.unlock()
        }
    }

    suspend fun fullSync(userId: String) {
        pushPendingChanges(userId)
        pullRemoteChanges(userId)
    }
}

private fun com.todowka.app.data.remote.dto.response.TaskResponse.toEntity() = TaskEntity(
    id = id,
    userId = userId,
    title = title,
    description = description,
    gtdStatus = gtdStatus,
    contextId = contextId,
    areaId = areaId,
    projectId = projectId,
    eventId = eventId,
    isCompleted = isCompleted,
    completedAt = completedAt,
    position = position,
    dueDate = dueDate,
    notes = notes,
    recurrenceType = recurrenceType,
    recurrenceConfig = recurrenceConfig,
    recurrenceEndDate = recurrenceEndDate,
    reminderTime = reminderTime,
    reminderOffsets = reminderOffsets?.toString(),
    reminderFired = reminderFired,
    lastReminderSentAt = lastReminderSentAt,
    createdAt = createdAt,
    updatedAt = updatedAt,
    _syncStatus = "synced",
    _lastSyncedAt = DateTimeUtils.nowIso()
)

private fun com.todowka.app.data.remote.dto.response.ProjectResponse.toEntity() = ProjectEntity(
    id = id,
    userId = userId,
    name = name,
    description = description,
    color = color,
    areaId = areaId,
    isActive = isActive,
    sortOrder = sortOrder,
    createdAt = createdAt,
    updatedAt = updatedAt,
    _syncStatus = "synced",
    _lastSyncedAt = DateTimeUtils.nowIso()
)

private fun com.todowka.app.data.remote.dto.response.AreaResponse.toEntity() = AreaEntity(
    id = id,
    userId = userId,
    name = name,
    description = description,
    color = color,
    sortOrder = sortOrder,
    createdAt = createdAt,
    updatedAt = updatedAt,
    _syncStatus = "synced",
    _lastSyncedAt = DateTimeUtils.nowIso()
)

private fun com.todowka.app.data.remote.dto.response.ContextResponse.toEntity() = ContextEntity(
    id = id,
    userId = userId,
    name = name,
    color = color,
    icon = icon,
    createdAt = createdAt,
    updatedAt = updatedAt,
    _syncStatus = "synced",
    _lastSyncedAt = DateTimeUtils.nowIso()
)

private fun com.todowka.app.data.remote.dto.response.TagResponse.toEntity() = TagEntity(
    id = id,
    userId = userId,
    name = name,
    color = color,
    createdAt = createdAt,
    updatedAt = updatedAt,
    _syncStatus = "synced",
    _lastSyncedAt = DateTimeUtils.nowIso()
)

private fun com.todowka.app.data.remote.dto.response.CalendarEventResponse.toEntity(userId: String) = CalendarEventEntity(
    id = id,
    userId = userId,
    title = title,
    description = description,
    startTime = startTime,
    endTime = endTime,
    allDay = allDay,
    color = color,
    location = location,
    attendees = attendees?.toString(),
    recurrenceType = recurrenceType,
    recurrenceConfig = recurrenceConfig,
    recurrenceEndDate = recurrenceEndDate,
    createdAt = createdAt,
    updatedAt = updatedAt,
    _syncStatus = "synced",
    _lastSyncedAt = DateTimeUtils.nowIso()
)

private fun com.todowka.app.data.remote.dto.response.VerbTemplateResponse.toEntity(userId: String) = VerbTemplateEntity(
    id = id,
    userId = userId,
    text = text,
    icon = icon,
    position = position,
    createdAt = createdAt,
    updatedAt = updatedAt,
    _syncStatus = "synced",
    _lastSyncedAt = DateTimeUtils.nowIso()
)

private fun com.todowka.app.data.remote.dto.response.ProjectDetailResponse.toEntity() = ProjectEntity(
    id = id,
    userId = userId,
    name = name,
    description = description,
    color = color,
    areaId = areaId,
    isActive = isActive,
    sortOrder = sortOrder,
    createdAt = createdAt,
    updatedAt = updatedAt,
    _syncStatus = "synced",
    _lastSyncedAt = DateTimeUtils.nowIso()
)
