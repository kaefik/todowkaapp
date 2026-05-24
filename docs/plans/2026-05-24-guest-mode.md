# Гостевой режим (Guest Mode)

**Дата:** 2026-05-24
**Статус:** Реализовано

## Цель

При первом входе пользователь может зайти как гость — все возможности работают локально без бекенда. Когда пользователь указывает URL бекенда, он может зарегистрироваться или войти в аккаунт, при этом гостевые данные переносятся на аккаунт.

## Подход

**GuestUserId через константу (Подход A)**

- Генерируем UUID при первом входе как гость, сохраняем в `AuthPreferences` как `guest_user_id`
- `isLoggedIn` = `accessToken != null || guestUserId != null` — гость считается «вошедшим»
- В NavGraph: если гость или залогинен — показываем главный экран, иначе — логин
- SyncEngine: пропускается если `isGuestMode == true`
- При логине: миграция всех сущностей с `guestUserId` на реальный `userId` через UPDATE в Room, удаление guestUserId из prefs

### Почему этот подход

Архитектура уже offline-first: все CRUD идут только в Room DB. Все DAO фильтруют по `userId` (String). Гость получает фиктивный userId, все DAO работают без изменений. При логине — один UPDATE-запрос для миграции.

## Дизайн

### Хранение состояния гостя

**AuthPreferences** — добавляем:
- `guestUserId: String?` — UUID, генерируется при входе как гость
- `isGuestMode: Boolean` — `guestUserId != null`

**AuthRepositoryImpl** — меняем логику `isLoggedIn`:
- Сейчас: `accessToken != null`
- Станет: `accessToken != null || guestUserId != null`

Новый метод `enterGuestMode()` — генерирует UUID, сохраняет в prefs, ставит `_isLoggedIn = true`.

Новый метод `isGuestMode: StateFlow<Boolean>` — для UI и SyncEngine.

### Навигация

**NavGraph** — `startDestination`:
- `accessToken != null` → главный экран (залогинен)
- `guestUserId != null` → главный экран (гость)
- иначе → Login экран

### LoginScreen

Добавляем кнопку **«Продолжить как гость»** внизу формы. По нажатию — `authRepository.enterGuestMode()`, навигация на главный экран.

### SyncEngine и SyncWorker

SyncWorker проверяет `isGuestMode` — если гость, пропускает синхронизацию (нет сервера/токена).

### Миграция данных при логине

Когда гость логинится/регистрируется:

```sql
UPDATE tasks SET userId = :realUserId WHERE userId = :guestUserId
UPDATE projects SET userId = :realUserId WHERE userId = :guestUserId
UPDATE areas SET userId = :realUserId WHERE userId = :guestUserId
UPDATE contexts SET userId = :realUserId WHERE userId = :guestUserId
UPDATE tags SET userId = :realUserId WHERE userId = :guestUserId
UPDATE checklist_items SET userId = :realUserId WHERE userId = :guestUserId
UPDATE calendar_events SET userId = :realUserId WHERE userId = :guestUserId
UPDATE verb_templates SET userId = :realUserId WHERE userId = :guestUserId
UPDATE mutations SET userId = :realUserId WHERE userId = :guestUserId
UPDATE sync_meta SET userId = :realUserId WHERE userId = :guestUserId
UPDATE task_tag_cross_ref SET userId = :realUserId WHERE userId = :guestUserId
```

**Важно:** Нельзя использовать `performInitialSync` — он удаляет все локальные данные (`deleteByUserId` по всем таблицам, `SyncEngine.kt:89-96`). Вместо этого:

1. Миграция userId в транзакции (UPDATE выше)
2. `pushPendingChanges(realUserId)` — отправляет гостевые данные на сервер через мутации (каждый write в Room создаёт MutationEntity)
3. `pullRemoteChanges(realUserId)` — подтягивает данные с сервера поверх локальных

Таким образом гостевые данные сохраняются и отправляются на сервер, а существующие серверные данные подтягиваются.

**Предусловие:** бекенд должен принимать предустановленный `id` в `TaskCreateRequest` (текущая реализация отправляет `id = task.id`). Если бекенд отклоняет клиентский UUID — данные не синхронизируются.

### Валидация URL сервера перед логином

Когда гость нажимает «Войти в аккаунт» из ProfileScreen, проверяется:
- Если URL сервера = дефолтный `http://10.0.2.2:8000/` — показать диалог «Сначала укажите URL сервера в Настройках → Общие» с кнопкой перехода в настройки
- Иначе — навигация на LoginScreen

На LoginScreen (если вход из гостевого режима) также проверять URL и показывать предупреждение при ошибке соединения: «Проверьте URL сервера в Настройках».

### UI в гостевом режиме

- **ProfileScreen** — вместо данных профиля показывает «Вы в гостевом режиме» + кнопку «Войти в аккаунт» (с проверкой URL)
- **ProfileScreen → Выйти** — диалог подтверждения «Все локальные данные будут удалены. Продолжить?» перед вызовом `logout()`
- **SettingsScreen → Общие** — URL сервера + подсказка «Укажите URL сервера для входа в аккаунт» (если гость)
- **SettingsScreen → Безопасность** — скрыта для гостя
- **Sidebar/Header** — показывает «Гость» вместо имени пользователя

## План реализации

### Шаг 1: AuthPreferences — поддержка гостя
**Файл:** `data/local/preferences/AuthPreferences.kt`

- Добавить `guestUserId: String?` — геттер/сеттер в SharedPreferences
- Добавить `isGuestMode: Boolean` — `guestUserId != null`
- Добавить `saveGuestUserId(id: String)`
- Добавить `clearGuestMode()` — удаляет guestUserId

### Шаг 2: AuthRepository — новые методы
**Файлы:** `domain/repository/AuthRepository.kt`, `data/repository/AuthRepositoryImpl.kt`

- Добавить `val isGuestMode: StateFlow<Boolean>` в интерфейс
- Изменить `isLoggedIn`: инициализировать `true` если `accessToken != null || guestUserId != null`
- Новый метод `enterGuestMode()` — генерирует UUID, сохраняет в prefs, ставит `_isLoggedIn = true`, `_isGuestMode = true`
- Изменить `login()` — если `isGuestMode`: (1) миграция данных через `db.migrateGuestData()`, (2) `syncEngine.pushPendingChanges()`, (3) `syncEngine.pullRemoteChanges()`, (4) сохранить токены, (5) очистить guestUserId. НЕ вызывать `performInitialSync` — он удаляет локальные данные
- Изменить `logout()` — также очищать guestUserId. Для гостя: показывать диалог подтверждения «Все данные будут удалены» перед вызовом logout (логика в UI)

### Шаг 3: Навигация
**Файл:** `ui/navigation/NavGraph.kt`

- `startDestination`: если `isLoggedIn` (включая гостя) → Tasks, иначе → Login

### Шаг 4: LoginScreen — кнопка «Гость»
**Файл:** `ui/screens/auth/LoginScreen.kt`

- Добавить `OutlinedButton` «Продолжить как гость» внизу формы
- По нажатию: `authRepository.enterGuestMode()`, навигация на Tasks

### Шаг 5: SyncEngine — пропуск для гостя
**Файлы:** `data/sync/SyncEngine.kt`, `di/WorkerModule.kt`

- SyncWorker: проверять `isGuestMode`, если гость — завершать работу сразу
- SyncEngine: в каждом публичном методе проверять `isGuestMode`, возвращать если гость

### Шаг 6: Миграция данных при логине
**Файл:** `data/local/db/TodowkaDatabase.kt` — добавить абстрактный метод, создать DAO или добавить `@RawQuery` в существующие DAO

- Добавить метод `migrateGuestData(guestId: String, realId: String)` — UPDATE по всем таблицам (в @Transaction)
- Выполнять в `AuthRepositoryImpl.login()` перед `pushPendingChanges`
- После миграции: `syncEngine.pushPendingChanges(realUserId)` → `syncEngine.pullRemoteChanges(realUserId)`
- НЕ вызывать `performInitialSync` — он удаляет все локальные данные
- Таблицы: tasks, projects, areas, contexts, tags, checklist_items, calendar_events, verb_templates, mutations, sync_meta, task_tag_cross_ref

### Шаг 7: UI для гостя
**Файлы:** `ui/screens/profile/ProfileScreen.kt`, `ui/screens/settings/SettingsScreen.kt`, sidebar/header

- ProfileScreen: если гость — показывать «Гостевой режим» + кнопку «Войти в аккаунт»
  - При нажатии «Войти в аккаунт»: проверить URL сервера. Если дефолтный — показать диалог «Сначала укажите URL сервера в Настройках» с кнопкой перехода. Иначе — навигация на LoginScreen
  - При нажатии «Выйти»: диалог подтверждения «Все локальные данные будут удалены»
- SettingsScreen → вкладка «Безопасность»: скрыта для гостя
- Sidebar/Header: показывать «Гость» вместо имени

### Шаг 8: AuthInitializer
**Файл:** `ui/components/AuthInitializer.kt`

- Пропускать `getCurrentUser()` если `isGuestMode`

## Порядок выполнения

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
