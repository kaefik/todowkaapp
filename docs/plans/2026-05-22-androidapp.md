# Android App Todowka — План реализации

**Дата**: 2026-05-22
**Статус**: Утвержден (после 2 раундов критики)
**Цель**: Полная копия веб-фронтенда Todowka как нативное Android приложение в папке `androidapp/`
**Критика**: `docs/plans/2026-05-22-androidapp-critique.md`

---

## 1. Технологический стек

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Язык | Kotlin | 2.3.21 |
| Min SDK | API 26 (Android 8.0) | — |
| Target SDK | API 35 (Android 15) | — |
| UI | Jetpack Compose | BOM 2026.05.01 |
| Navigation | Navigation Compose | 2.9.8 |
| DI | Koin | 4.2.1 |
| Local DB | Room | 2.8.4 |
| Network | Retrofit + OkHttp | 2.12.0 / 4.12.2 |
| JSON конвертер | Kotlinx Serialization | 1.11.0 + Retrofit converter |
| Sync | WorkManager | 2.11.2 |
| Settings | DataStore (Preferences) | 1.1.4 |
| Push | Firebase Cloud Messaging | 25.0.2 |
| Calendar | Custom Compose Canvas | — |
| i18n | Android string resources | — |

**Примечание к версиям**: Retrofit 2.12 + OkHttp 4.12 — стабильная пара. Retrofit 3.0 существует, но зависит от OkHttp 4.12 (не 5.x). OkHttp 5.x — мажорное обновление, пока не требуется.

---

## 2. Архитектура

### 2.1 MVVM + Repository (без Domain/UseCase слоя)

```
UI Layer (Jetpack Compose)
    ↕ StateFlow/SharedFlow
ViewModel Layer (бизнес-логика)
    ↕ Coroutines
Data Layer (Repository Pattern)
    ↕              ↕
Room (Local)    Retrofit (Remote)
    ↕
Sync Engine (bidirectional)
```

UseCase слой убран — для данного масштаба проекта ViewModel → Repository достаточно. Это уменьшает количество файлов на ~30 без потери чистоты.

### 2.2 Структура проекта

```
androidapp/
├── app/
│   ├── src/main/
│   │   ├── java/com/todowka/app/
│   │   │   ├── TodowkaApp.kt
│   │   │   ├── MainActivity.kt
│   │   │   ├── di/
│   │   │   │   ├── AppModule.kt
│   │   │   │   ├── NetworkModule.kt       # Retrofit, OkHttp, AuthInterceptor
│   │   │   │   ├── DatabaseModule.kt      # Room, DAOs
│   │   │   │   ├── RepositoryModule.kt
│   │   │   │   ├── ViewModelModule.kt
│   │   │   │   └── WorkerModule.kt
│   │   │   ├── data/
│   │   │   │   ├── local/
│   │   │   │   │   ├── db/
│   │   │   │   │   │   ├── TodowkaDatabase.kt
│   │   │   │   │   │   ├── entity/
│   │   │   │   │   │   │   ├── TaskEntity.kt
│   │   │   │   │   │   │   ├── ProjectEntity.kt
│   │   │   │   │   │   │   ├── AreaEntity.kt
│   │   │   │   │   │   │   ├── ContextEntity.kt
│   │   │   │   │   │   │   ├── TagEntity.kt
│   │   │   │   │   │   │   ├── TaskTagCrossRef.kt
│   │   │   │   │   │   │   ├── ChecklistItemEntity.kt
│   │   │   │   │   │   │   ├── CalendarEventEntity.kt
│   │   │   │   │   │   │   ├── VerbTemplateEntity.kt
│   │   │   │   │   │   │   ├── MutationEntity.kt
│   │   │   │   │   │   │   └── SyncMetaEntity.kt
│   │   │   │   │   │   ├── dao/
│   │   │   │   │   │   │   ├── TaskDao.kt
│   │   │   │   │   │   │   ├── ProjectDao.kt
│   │   │   │   │   │   │   ├── AreaDao.kt
│   │   │   │   │   │   │   ├── ContextDao.kt
│   │   │   │   │   │   │   ├── TagDao.kt
│   │   │   │   │   │   │   ├── ChecklistItemDao.kt
│   │   │   │   │   │   │   ├── CalendarEventDao.kt
│   │   │   │   │   │   │   ├── VerbTemplateDao.kt
│   │   │   │   │   │   │   ├── MutationDao.kt
│   │   │   │   │   │   │   └── SyncMetaDao.kt
│   │   │   │   │   │   └── converter/
│   │   │   │   │   │       ├── Converters.kt
│   │   │   │   │   │       └── SyncStatusConverter.kt
│   │   │   │   │   └── preferences/
│   │   │   │   │       ├── AuthPreferences.kt       # Bearer tokens
│   │   │   │   │       ├── UserPreferences.kt
│   │   │   │   │       └── SyncPreferences.kt
│   │   │   │   ├── remote/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   ├── AuthApi.kt
│   │   │   │   │   │   ├── TasksApi.kt
│   │   │   │   │   │   ├── ProjectsApi.kt
│   │   │   │   │   │   ├── AreasApi.kt
│   │   │   │   │   │   ├── ContextsApi.kt
│   │   │   │   │   │   ├── TagsApi.kt
│   │   │   │   │   │   ├── ChecklistApi.kt
│   │   │   │   │   │   ├── CalendarEventsApi.kt
│   │   │   │   │   │   ├── NotificationsApi.kt
│   │   │   │   │   │   ├── ReviewApi.kt
│   │   │   │   │   │   ├── VerbTemplatesApi.kt
│   │   │   │   │   │   ├── SessionsApi.kt
│   │   │   │   │   │   ├── ExportImportApi.kt
│   │   │   │   │   │   ├── BackupScheduleApi.kt
│   │   │   │   │   │   ├── UsersApi.kt
│   │   │   │   │   │   ├── TelegramApi.kt
│   │   │   │   │   │   ├── DevicesApi.kt             # FCM token registration
│   │   │   │   │   │   └── ConfigApi.kt
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── request/
│   │   │   │   │   │   └── response/
│   │   │   │   │   └── interceptor/
│   │   │   │   │       ├── AuthInterceptor.kt         # Bearer token header
│   │   │   │   │       └── TokenRefreshInterceptor.kt  # Auto-refresh on 401
│   │   │   │   ├── repository/
│   │   │   │   │   ├── TaskRepositoryImpl.kt
│   │   │   │   │   ├── ProjectRepositoryImpl.kt
│   │   │   │   │   ├── AreaRepositoryImpl.kt
│   │   │   │   │   ├── ContextRepositoryImpl.kt
│   │   │   │   │   ├── TagRepositoryImpl.kt
│   │   │   │   │   ├── CalendarEventRepositoryImpl.kt
│   │   │   │   │   ├── VerbTemplateRepositoryImpl.kt
│   │   │   │   │   ├── NotificationRepositoryImpl.kt
│   │   │   │   │   ├── AuthRepositoryImpl.kt
│   │   │   │   │   └── ReviewRepositoryImpl.kt
│   │   │   │   └── sync/
│   │   │   │       ├── SyncEngine.kt
│   │   │   │       ├── SyncWorker.kt
│   │   │   │       ├── PushWorker.kt
│   │   │   │       ├── SyncMutex.kt
│   │   │   │       ├── EchoSuppressor.kt
│   │   │   │       ├── ConflictResolver.kt
│   │   │   │       ├── TombstoneProcessor.kt
│   │   │   │       └── SyncStatusTracker.kt
│   │   │   ├── ui/
│   │   │   │   ├── theme/
│   │   │   │   │   ├── Theme.kt
│   │   │   │   │   ├── Color.kt
│   │   │   │   │   ├── Type.kt
│   │   │   │   │   └── Shape.kt
│   │   │   │   ├── components/
│   │   │   │   │   ├── AppLayout.kt
│   │   │   │   │   ├── Sidebar.kt
│   │   │   │   │   ├── SidebarSection.kt
│   │   │   │   │   ├── ProtectedRoute.kt
│   │   │   │   │   ├── AuthInitializer.kt
│   │   │   │   │   ├── SyncStatus.kt
│   │   │   │   │   ├── StatusLight.kt
│   │   │   │   │   ├── OfflineBanner.kt
│   │   │   │   │   ├── TaskListView.kt
│   │   │   │   │   ├── TaskCard.kt
│   │   │   │   │   ├── TaskEditModal.kt           # Bottom sheet
│   │   │   │   │   ├── TaskDetailModal.kt
│   │   │   │   │   ├── TaskFilterPanel.kt
│   │   │   │   │   ├── TaskQuickActions.kt
│   │   │   │   │   ├── TaskGroupSection.kt
│   │   │   │   │   ├── VerbChips.kt
│   │   │   │   │   ├── VerbFab.kt
│   │   │   │   │   ├── RecurrenceEditor.kt
│   │   │   │   │   ├── ReminderEditor.kt
│   │   │   │   │   ├── SortGroupPopover.kt
│   │   │   │   │   ├── SearchOverlay.kt
│   │   │   │   │   ├── ColorPickerField.kt
│   │   │   │   │   ├── ConfirmDialog.kt
│   │   │   │   │   ├── ToastContainer.kt
│   │   │   │   │   ├── NotificationBell.kt
│   │   │   │   │   ├── DeleteAccountModal.kt
│   │   │   │   │   ├── GtdTaskList.kt
│   │   │   │   │   └── calendar/
│   │   │   │   │       ├── CalendarHeader.kt
│   │   │   │   │       ├── MonthView.kt
│   │   │   │   │       ├── WeekView.kt
│   │   │   │   │       ├── DayView.kt
│   │   │   │   │       ├── YearView.kt
│   │   │   │   │       ├── CalendarEventCard.kt
│   │   │   │   │       ├── CalendarTaskCard.kt
│   │   │   │   │       ├── EventEditorModal.kt
│   │   │   │   │       └── DayDetailDrawer.kt
│   │   │   │   ├── navigation/
│   │   │   │   │   ├── NavGraph.kt
│   │   │   │   │   ├── AuthNavGraph.kt
│   │   │   │   │   ├── MainNavGraph.kt
│   │   │   │   │   └── Routes.kt
│   │   │   │   └── screens/
│   │   │   │       ├── auth/
│   │   │   │       │   ├── LoginScreen.kt + LoginViewModel
│   │   │   │       │   └── RegisterScreen.kt + RegisterViewModel
│   │   │   │       ├── onboarding/
│   │   │   │       │   ├── OnboardingScreen.kt + OnboardingViewModel
│   │   │   │       │   ├── OnboardingLanguage.kt
│   │   │   │       │   ├── OnboardingTimezone.kt
│   │   │   │       │   └── OnboardingSection.kt
│   │   │   │       ├── tasks/
│   │   │   │       │   ├── TasksScreen.kt + TasksViewModel
│   │   │   │       │   ├── InboxScreen.kt
│   │   │   │       │   ├── ActiveScreen.kt
│   │   │   │       │   ├── TodayScreen.kt + TodayViewModel
│   │   │   │       │   ├── TomorrowScreen.kt
│   │   │   │       │   ├── NextActionsScreen.kt
│   │   │   │       │   ├── WaitingForScreen.kt
│   │   │   │       │   ├── SomedayScreen.kt
│   │   │   │       │   ├── CompletedScreen.kt
│   │   │   │       │   └── TrashScreen.kt
│   │   │   │       ├── projects/
│   │   │   │       │   ├── ProjectsScreen.kt + ProjectsViewModel
│   │   │   │       │   └── ProjectDetailScreen.kt + ProjectDetailViewModel
│   │   │   │       ├── areas/
│   │   │   │       │   ├── AreasScreen.kt + AreasViewModel
│   │   │   │       │   └── AreaDetailScreen.kt
│   │   │   │       ├── contexts/
│   │   │   │       │   └── ContextsScreen.kt + ContextsViewModel
│   │   │   │       ├── tags/
│   │   │   │       │   └── TagsScreen.kt + TagsViewModel
│   │   │   │       ├── calendar/
│   │   │   │       │   ├── CalendarScreen.kt + CalendarViewModel
│   │   │   │       │   └── EventsScreen.kt
│   │   │   │       ├── review/
│   │   │   │       │   ├── ReviewScreen.kt + ReviewViewModel
│   │   │   │       │   ├── ReviewDashboard.kt
│   │   │   │       │   ├── ReviewOverdue.kt
│   │   │   │       │   ├── ReviewInbox.kt
│   │   │   │       │   ├── ReviewProjects.kt
│   │   │   │       │   ├── ReviewSomeday.kt
│   │   │   │       │   ├── ReviewCompletion.kt
│   │   │   │       │   └── ReviewMinimap.kt
│   │   │   │       ├── notifications/
│   │   │   │       │   └── NotificationsScreen.kt + NotificationsViewModel
│   │   │   │       ├── profile/
│   │   │   │       │   └── ProfileScreen.kt + ProfileViewModel
│   │   │   │       ├── settings/
│   │   │   │       │   ├── SettingsScreen.kt + SettingsViewModel
│   │   │   │       │   ├── SettingsProfileTab.kt
│   │   │   │       │   ├── SettingsGeneralTab.kt
│   │   │   │       │   ├── SettingsAppearanceTab.kt
│   │   │   │       │   ├── SettingsSecurityTab.kt
│   │   │   │       │   ├── SettingsVerbsTab.kt
│   │   │   │       │   └── SettingsAdminTab.kt
│   │   │   │       └── sessions/
│   │   │   │           └── SessionsScreen.kt
│   │   │   ├── service/
│   │   │   │   ├── FcmService.kt
│   │   │   │   └── ReminderScheduler.kt
│   │   │   ├── receiver/
│   │   │   │   └── ReminderReceiver.kt
│   │   │   └── util/
│   │   │       ├── NetworkMonitor.kt
│   │   │       ├── DateTimeUtils.kt
│   │   │       ├── Result.kt               # sealed class Success/Error/Loading
│   │   │       ├── GtdStatus.kt
│   │   │       └── SyncStatus.kt
│   │   └── res/
│   │       ├── values/
│   │       ├── values-ru/
│   │       ├── values-tt/
│   │       ├── drawable/
│   │       └── xml/
│   ├── src/test/
│   ├── src/androidTest/
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── gradlew
├── gradlew.bat
└── run.sh
```

---

## 3. Data Layer

### 3.1 Room Database

**База**: `TodowkaDatabase`, версия 1

**Миграции**: На этапе разработки — `fallbackToDestructiveMigration()`. Начиная с production (выход на пользователей) — явные `Migration(N, N+1)`.

**Мультипользовательская изоляция**: Все entity таблицы содержат `user_id` колонку. Все DAO queries фильтруют по `WHERE user_id = :userId`. При logout — `DELETE FROM <table> WHERE user_id = :userId`.

**Entities**:

| Entity | PK | Ключевые поля | Isolation | Sync поля |
|--------|----|---------------|-----------|-----------|
| TaskEntity | id (UUID) | user_id, title, description, gtd_status, context_id, area_id, project_id, due_date, is_completed, position, recurrence_*, reminder_* | user_id | _syncStatus, _lastSyncedAt |
| ProjectEntity | id (UUID) | user_id, name, description, color, area_id, is_active, sort_order | user_id | _syncStatus, _lastSyncedAt |
| AreaEntity | id (UUID) | user_id, name, description, color, sort_order | user_id | _syncStatus, _lastSyncedAt |
| ContextEntity | id (UUID) | user_id, name, color, icon | user_id | _syncStatus, _lastSyncedAt |
| TagEntity | id (UUID) | user_id, name, color | user_id | _syncStatus, _lastSyncedAt |
| TaskTagCrossRef | taskId, tagId | user_id | user_id | — |
| ChecklistItemEntity | id (UUID) | user_id, task_id, title, is_completed, position | user_id | _syncStatus, _lastSyncedAt |
| CalendarEventEntity | id (UUID) | user_id, title, description, start_time, end_time, all_day, color, location, attendees, recurrence_* | user_id | _syncStatus, _lastSyncedAt |
| VerbTemplateEntity | id (UUID) | user_id, text, icon, position | user_id | _syncStatus, _lastSyncedAt |
| MutationEntity | id (Long, auto) | userId, entityType, entityId, operation (create/update/delete/toggle/move), payload (JSON), createdAt | userId | — |
| SyncMetaEntity | userId + resourceType (composite PK) | lastSyncedAt | userId | — |

**SyncStatus enum**: `synced`, `local`, `modified`, `deleted`

**Relations**:
- TaskEntity ↔ TagEntity = M:N через TaskTagCrossRef (с user_id, ForeignKey CASCADE на обе стороны)
- TaskEntity → ProjectEntity (nullable FK)
- TaskEntity → ContextEntity (nullable FK)
- TaskEntity → AreaEntity (nullable FK)
- ProjectEntity → AreaEntity (nullable FK)

**Task-Tag синхронизация**: Теги приходят внутри TaskResponse как `tags: [{id, name, color}]`. При pull: upsert в TagEntity + обновить TaskTagCrossRef. При push: отправить `tag_ids: [...]` в TaskCreate/TaskUpdate.

**Пример DAO query с изоляцией**:
```kotlin
@Query("SELECT * FROM tasks WHERE user_id = :userId AND gtd_status = :status AND _syncStatus != 'deleted' ORDER BY position ASC")
fun getByStatus(userId: String, status: String): Flow<List<TaskEntity>>
```

### 3.2 Sync Engine

**Двусторонняя синхронизация**, аналог syncEngine.ts из веба:

1. **Push flow**:
   - Читает MutationEntity (pending changes) для текущего userId
   - Группирует по entityType
   - Отправляет POST/PUT/DELETE на API с Bearer token
   - При успехе: удаляет mutation, обновляет _syncStatus → synced
   - При конфликте: LWW resolution
   - Mutex предотвращает параллельный push/pull (60s timeout)
   - Retry: exponential backoff (1s, 2s, 4s, 8s, max 5min), max 3 retries, потом mark as failed

2. **Pull flow**:
   - Incremental pull с `updated_since` из SyncMetaEntity
   - Upsert в Room, обновляет SyncMeta
   - Обрабатывает tombstones через `/api/deleted`
   - LWW conflict resolution (server priority on tie)

3. **Triggers**:
   - Room DB change → debounce 1.5s → PushWorker
   - Periodic: WorkManager каждые 15 мин → full sync (push + pull)
   - App startup → initial sync check
   - App foreground → immediate pull

4. **Echo suppression**: После push записывает entity IDs в EchoSuppressor (5s TTL), pull пропускает эти записи.

5. **Initial sync**: После логина — полная загрузка всех ресурсов через `performInitialSync(userId)`. Если sync прерывается — показать loading state и retry. Не показывать данные пока initial sync не завершён полностью.

### 3.3 Аутентификация — Bearer Token

Бэкенд использует cookie-based JWT (HttpOnly cookies). Для Android приложения добавляется **опциональная** поддержка Bearer token.

**Android сторона**:
- `AuthPreferences` хранит `accessToken` и `refreshToken` как строки в `EncryptedSharedPreferences`
- `AuthInterceptor`: добавляет `Authorization: Bearer <accessToken>` к каждому запросу + `X-Requested-With: XMLHttpRequest`
- `TokenRefreshInterceptor`: при 401 → POST `/api/auth/refresh` с `Authorization: Bearer <refreshToken>` → обновляет оба токена → повторяет запрос
- При неудачном refresh → logout + redirect на Login
- Обработка потери ключа: try-catch при чтении EncryptedSharedPreferences → если ошибка расшифровки (смена device lock) → очистить данные, перенаправить на логин

**Бэкенд доработка** (минимальная):
- `get_current_user` dependency: добавить чтение токена из `Authorization: Bearer` header как fallback к cookie
- `/api/auth/refresh`: принимать refresh_token из body или header (не только cookie)
- `/api/auth/login`: возвращать tokens в JSON body (помимо cookies) для мобильных клиентов

---

## 4. UI Layer

### 4.1 Navigation

```
NavGraph
├── AuthNavGraph
│   ├── login
│   └── register
├── onboarding/{step}
├── MainNavGraph (внутри AppLayout)
│   ├── tasks (default redirect)
│   ├── inbox
│   ├── active
│   ├── today
│   ├── tomorrow
│   ├── next
│   ├── waiting
│   ├── someday
│   ├── completed
│   ├── trash
│   ├── projects
│   ├── projects/{id}
│   ├── projects/no-project
│   ├── areas
│   ├── areas/{id}
│   ├── contexts
│   ├── tags
│   ├── calendar
│   ├── events
│   ├── notifications
│   ├── profile
│   └── settings
└── review (full-screen wizard)
    ├── dashboard
    ├── overdue
    ├── inbox
    ├── projects
    ├── someday
    └── completion
```

### 4.2 AppLayout

Копия layout-структуры веб-версии с адаптацией под Android:
- `ModalNavigationDrawer` (sidebar) слева
- Sidebar содержит 3 группы: GTD (Inbox/Active/Today/Tomorrow/Next/Waiting/Someday), Views (Calendar/Tasks/Projects/Areas/Contexts/Tags), Manage (Completed/Trash)
- GTD статусы с badge counts (reactive из Room)
- TopAppBar: hamburger (mobile), section title, search icon, notification bell
- Content area: `NavHost`
- **Адаптация к Android**: hover effects → ripple/long press, веб-модалки → bottom sheets, веб-popovers → dropdown menus

### 4.3 Тема

- Primary: Indigo (`#4f46e5`, MaterialTheme colorScheme.primary)
- Dark mode: `isSystemInDarkTheme()` + ручной переключатель в настройках
- Typography: системный шрифт (Roboto)
- Shapes: `rounded-md` → `MaterialTheme.shapes.medium` (8dp)
- Custom animations: fadeIn, slideUp, scaleIn через Compose `AnimatedVisibility`
- Иконки: Material Icons (vector), без внешних изображений

### 4.4 Экраны (28+)

Каждый экран = Composable + ViewModel + State.

**Задачи** (GTD статусы):
- `GtdTaskList` — переиспользуемый composable для Inbox/Active/Next/Waiting/Someday/Completed/Trash
- Task input сверху + verb chips
- Task cards с checkbox, title, description preview, context/project/tag badges
- Long press → quick actions
- FAB для быстрого добавления (mobile)

**Сегодня**:
- Overdue block (collapsible)
- Tasks due today
- Completed today block

**Календарь** (4 views):
- Day: time grid (Canvas), tasks/events как блоки
- Week: 7 columns (desktop) / 2 columns + swipe (mobile)
- Month: `LazyVerticalGrid` 7x6
- Year: 12 mini-months
- Navigation header с view selector

**Еженедельный обзор**:
- Multi-step wizard (Dashboard → Overdue → Inbox → Projects → Someday → Completion)
- Horizontal pager для шагов
- Minimap навигация сверху

**Настройки**:
- Tabbed layout: Profile, General, Appearance, Security, Verbs, Admin
- Scrollable tabs

---

## 5. Платформенные фичи

### 5.1 Push-уведомления (FCM)

- `FirebaseMessagingService` обрабатывает push
- Device token отправляется на бэкенд через `POST /api/devices/register`
- Требует доработки бэкенда: FCM integration + device token storage
- Local notifications через `NotificationCompat`
- `onNewToken` callback → re-register на бэкенде (token может инвалидироваться при OS update, app restore)
- Notification channels: tasks, reminders, sync

### 5.2 Локальные уведомления

- `AlarmManager` + `BroadcastReceiver` для reminders (reminder_time, reminder_offsets)
- Permission: `SCHEDULE_EXACT_ALARM` (API 31+, user-revocable) → graceful fallback на `USE_EXACT_ALARM` или inexact alarms
- Exact alarms для reminder_time, inexact для reminder_offsets
- При повторе — логировать и показать fallback-уведомление

### 5.3 Real-time обновления (без foreground SSE service)

Вместо SSE foreground service (ненадёжный на Android 12+, OEM убивает):
- **Foreground**: OkHttp SSE в ViewModel scope (только когда app открыт)
- **Background**: WorkManager periodic polling каждые 15 мин
- **Push**: FCM для критичных уведомлений
- SSE автоматически отключается при уходе app в background (ViewModel scope destroyed)

### 5.4 i18n

- `strings.xml` для RU (values-ru), EN (values), TT (values-tt)
- ~200-300 строковых ресурсов (из 13 namespaces веба)
- Выбор языка в настройках + из onboarding
- Tatar keyboard bar — custom view для спецсимволов (Ә, Җ, Ң, Ө, Ү, Һ)

### 5.5 Export/Import

- Export: `ActivityResultContracts.CreateDocument` → сохраняет JSON
- Import: `ActivityResultContracts.OpenDocument` → отправляет multipart на API

### 5.6 Network Monitor

- `ConnectivityManager.NetworkCallback` для отслеживания online/offline
- `StateFlow<Boolean>` используется в SyncEngine и UI (OfflineBanner)

---

## 6. Обработка ошибок

### Стратегия

- **Repository** возвращает `AppResult<T>` (sealed class: Success, Error, Loading, чтобы не конфликтовать с kotlin.Result)
- **ViewModel** преобразует Result в UI state (data + isLoading + error)
- **UI** показывает: Loading spinner → Success content / Error с retry кнопкой
- **Sync errors**: exponential backoff (1s → 2s → 4s → 8s → max 5min), max 3 retries
- **Network errors**: offline banner + queue mutations для отправки при появлении сети
- **Auth errors**: 401 → auto-refresh → если failed → redirect на login с сообщением "Сессия истекла"
- **Server errors (5xx)**: показать toast "Ошибка сервера", не терять локальные данные

---

## 7. ProGuard / R8

**Обязательные keep-rules** для Kotlinx Serialization + Retrofit:

```proguard
-keepattributes *Annotation*, *Serial*
-keep class com.todowka.app.data.remote.dto.** { *; }
-keepclassmembers class com.todowka.app.data.remote.dto.** {
    static *** Companion;
}
```

Все DTO классы помечены `@Serializable`. Release build тестируется обязательно.

---

## 8. Бэкенд изменения

Для Android приложения потребуются доработки бэкенда:

### 8.1 Bearer token support (обязательно)
1. **`get_current_user`**: Добавить чтение `Authorization: Bearer <token>` header как fallback к cookie. Если cookie нет — проверить header. Не ломает веб-версию.
2. **`/api/auth/login`**: Добавить поля `access_token` и `refresh_token` к существующему `TokenResponse` (помимо cookies). Определять мобильный клиент по `X-Client-Type: android` header. Формат: `{"user": {...}, "session_id": "...", "access_token": "...", "refresh_token": "..."}`.
3. **`/api/auth/refresh`**: Принимать refresh_token из `Authorization: Bearer` header или JSON body `{"refresh_token": "..."}`. Возвращать новые tokens в body.

### 8.2 FCM push (обязательно)
4. **`POST /api/devices/register`**: Регистрация FCM device token
5. **FCM отправка**: Интеграция `firebase-admin` Python SDK
6. **`device_tokens` table**: user_id, token, platform (android/ios), app_version, created_at, updated_at

### 8.3 Schema migration
7. **Alembic миграция**: device_tokens table + возможные изменения для Bearer token support

---

## 9. Build & Run

### Сборка

```bash
cd androidapp
./gradlew assembleDebug          # Debug APK
./gradlew installDebug           # Install on device
./run.sh                         # Build + install + run
```

### Firebase setup (для FCM)

1. Создать Firebase project в [Firebase Console](https://console.firebase.google.com/)
2. Добавить Android app с package name `com.todowka.app`
3. Скачать `google-services.json` в `app/google-services.json`
4. Добавить `classpath("com.google.gms:google-services:4.4.2")` в root build.gradle.kts
5. Добавить `apply plugin: "com.google.gms.google-services"` в app/build.gradle.kts

### run.sh

Скрипт автоматической сборки:
1. Проверяет ANDROID_HOME
2. `./gradlew assembleDebug`
3. `adb install -r app/build/outputs/apk/debug/app-debug.apk`
4. `adb shell am start com.todowka.app/.MainActivity`

### Подпись

- Debug: стандартный debug keystore
- Release: отдельный keystore (не в репозитории)

---

## 10. Testing

### Unit Tests

- JUnit5 + MockK для repositories
- Turbine для Flow тестов
- Room in-memory database для DAO тестов

### UI Tests

- Compose Testing (`createComposeRule()`)
- Экраны: логин, список задач, создание задачи, календарь

### Integration Tests

- Sync engine end-to-end с mock API
- Token refresh flow
- Offline → online sync
- Multi-user data isolation

---

## 11. Порядок реализации

### V1.0 — Основное приложение

#### Phase 0: Backend (предварительно)
1. Бэкенд: Bearer token support (см. секцию 8.1)
2. Бэкенд: FCM endpoints + device_tokens table (см. секцию 8.2)
3. Firebase project setup + google-services.json

#### Phase 1: Foundation
4. Gradle project setup (Compose, Koin, Room, Retrofit, WorkManager)
5. Data layer: Room entities, DAOs, database (с user_id isolation)
6. Network layer: Retrofit APIs, Bearer token interceptors
7. Auth flow: Login, Register, token refresh
8. DI modules (Koin)

#### Phase 2: Core GTD
9. Task CRUD (offline-first repository с user_id)
10. Sync engine (push/pull/initial sync)
11. AppLayout + Sidebar navigation
12. Task list screens (Inbox, Active, Today, Tomorrow, Next, Waiting, Someday)
13. Task edit modal (bottom sheet)
14. Completed, Trash screens

#### Phase 3: Organization
15. Projects CRUD + detail screen
16. Areas CRUD + detail screen
17. Contexts CRUD
18. Tags CRUD
19. Task filters, search, sort/group

#### Phase 4: Calendar & Events
20. Calendar views (Month, Week, Day, Year)
21. Calendar events CRUD
22. Calendar event editor modal

#### Phase 5: Advanced
23. Weekly Review wizard
24. Notifications (FCM push + локальные reminders)
25. Verb templates
26. Settings screen (Profile, General, Appearance, Security, Verbs tabs)
27. Profile + sessions management

### V1.1 — Локализация и улучшения
28. i18n (RU/EN/TT)
29. Export/Import
30. Dark mode toggle
31. Onboarding wizard
32. SearchOverlay (global search)
33. Admin tab в Settings

### V2.0 — Интеграции
34. Telegram integration
35. Backup schedule
36. Email notifications settings
37. SSE foreground (опционально, если polling недостаточен)

---

## 12. Изменения после критики

Исправления из `docs/plans/2026-05-22-androidapp-critique.md` (раунд 1):

| # | Проблема | Исправление |
|---|----------|-------------|
| BLOCKER 1 | Cookie-based auth ненадёжен | Bearer token с EncryptedSharedPreferences |
| BLOCKER 3 | Нет multi-user isolation | user_id во всех entity + DAO queries |
| BLOCKER 10 | PersistentCookieJar устарела | Убрана, заменена на Bearer token |
| WARNING 2 | Версии библиотек устарели | Обновлены до актуальных (май 2026) |
| WARNING 4 | Нет Room migration strategy | Добавлена (fallbackToDestructive → явные миграции) |
| WARNING 5 | SSE foreground service ненадёжен | Polling через WorkManager + SSE только в foreground |
| WARNING 7 | Нет ProGuard rules | Добавлена секция с keep-rules |
| WARNING 9 | Копия веб-дизайна vs Android UX | Уточнено: layout копируется, interactions адаптируются |
| WARNING 12 | UseCase layer — overkill | Убран, ViewModel → Repository |
| WARNING 13 | EncryptedSharedPreferences + lock screen | Добавлен try-catch → re-login |
| WARNING 15 | Нет error handling | Добавлена секция с AppResult<T> и retry стратегией |
| WARNING 17 | Фаза 6 перегружена | Разбита на V1.0, V1.1, V2.0 |
| SUGGESTION 11 | Coil не нужен | Убран, используются Material Icons |
| WARNING 18 | Kotlinx Serialization не указан как Retrofit converter | Явно указан в стеке |

Исправления из `docs/plans/2026-05-22-androidapp-critique-v2.md` (раунд 2):

| # | Проблема | Исправление |
|---|----------|-------------|
| BLOCKER 1 | TaskTagCrossRef без user_id | Добавлен user_id + ForeignKey CASCADE |
| WARNING 2 | Result<T> конфликтует с kotlin.Result | Переименован в AppResult<T> |
| WARNING 4 | Не описана task-tag M:N синхронизация | Добавлено описание |
| WARNING 6 | Нет google-services.json для FCM | Добавлен Firebase setup в Build секцию |
| WARNING 7 | Login response format неточен | Уточнён: добавление полей к существующему TokenResponse |
| WARNING 8 | Нет rollback для failed initial sync | Добавлен loading state + retry |
| WARNING 10 | Бэкенд внутри Android Phase 1 | Вынесен в Phase 0 |
