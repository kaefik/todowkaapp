package com.todowka.app.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.todowka.app.data.local.db.converter.Converters
import com.todowka.app.data.local.db.converter.SyncStatusConverter
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
import com.todowka.app.data.local.db.entity.MutationEntity
import com.todowka.app.data.local.db.entity.ProjectEntity
import com.todowka.app.data.local.db.entity.SyncMetaEntity
import com.todowka.app.data.local.db.entity.TagEntity
import com.todowka.app.data.local.db.entity.TaskEntity
import com.todowka.app.data.local.db.entity.TaskTagCrossRef
import com.todowka.app.data.local.db.entity.VerbTemplateEntity

@Database(
    entities = [
        TaskEntity::class,
        ProjectEntity::class,
        AreaEntity::class,
        ContextEntity::class,
        TagEntity::class,
        TaskTagCrossRef::class,
        ChecklistItemEntity::class,
        CalendarEventEntity::class,
        VerbTemplateEntity::class,
        MutationEntity::class,
        SyncMetaEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class, SyncStatusConverter::class)
abstract class TodowkaDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun projectDao(): ProjectDao
    abstract fun areaDao(): AreaDao
    abstract fun contextDao(): ContextDao
    abstract fun tagDao(): TagDao
    abstract fun checklistItemDao(): ChecklistItemDao
    abstract fun calendarEventDao(): CalendarEventDao
    abstract fun verbTemplateDao(): VerbTemplateDao
    abstract fun mutationDao(): MutationDao
    abstract fun syncMetaDao(): SyncMetaDao
}
