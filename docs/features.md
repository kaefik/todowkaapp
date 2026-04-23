# Возможности (Features)

Этот документ отслеживает все реализованные возможности в Todowka и содержит инструкции по документированию новых функций.

## Текущие возможности

### Пользовательский опыт и основной функционал

#### Аутентификация и авторизация
- Регистрация нового аккаунта с email, username и паролем с автоматическим входом
- Первый зарегистрированный пользователь автоматически становится администратором
- Вход в систему с автоматическим управлением токенами
- Выход из системы с очисткой сессии
- Автоматическое продление сессии при работе с приложением
- Перенаправление на страницу входа при истечении сессии
- Автоматическое ограничение регистрации при достижении лимита пользователей (max_users)
- Скрытие ссылки на регистрацию на странице входа при исчерпании лимита пользователей
- Проверка блокировки пользователя при входе и обновлении токена
- Выбор часового пояса при первой авторизации
  - Модальное окно предлагается при первом входе, если timezone не установлен
  - Список популярных часовых поясов для быстрого выбора
  - Возможность ввести любой IANA часовой пояс
  - Автоматическое сохранение выбранного часового пояса в профиле пользователя
  - Перенаправление на главную страницу после выбора часового пояса
  - Компонент: `frontend/src/components/TimezoneSetupModal.tsx`
  - Интегрировано в Login и Register страницы

#### Управление задачами
- Быстрое создание задачи с заголовком (обязательно) и описанием (опционально)
- Просмотр всех задач с автоматическим разделением на активные и выполненные
- Разделы «Сегодня» и «Завтра» — все невыполненные задачи с дедлайном сегодня/завтра из любых GTD-статусов
  - Два отдельных пункта в сайдбаре (секция GTD) после Inbox с count-бейджами
  - Фильтрация по due_date в timezone пользователя (local-first, Dexie)
  - Роуты: `/today`, `/tomorrow`
  - Компоненты: `frontend/src/routes/Today.tsx`, `frontend/src/routes/Tomorrow.tsx`, `frontend/src/routes/DueDateTaskList.tsx`
  - Хук: `frontend/src/hooks/useDueDateTasks.ts`
  - Без изменений бэкенда
- Просмотр деталей задачи по клику на карточку (TaskDetailModal)
  - Клик по задаче открывает модальное окно с полной информацией: заголовок, описание, статус, контекст, проект, область, дедлайн, напоминания, теги, подзадачи
  - Кнопка «Редактировать» в модалке просмотра переходит к редактированию задачи
  - Интерактивные элементы (чекбокс, кнопки, ссылки, подзадачи) работают отдельно от клика по карточке
  - Работает на всех страницах: Tasks, Inbox, Next Actions, Waiting For, Someday, Completed, Trash
  - Компонент: `frontend/src/components/TaskDetailModal.tsx`
  - Файлы: `frontend/src/components/TaskListView.tsx`, `frontend/src/routes/Tasks.tsx`
- Редактирование заголовка и описания через модальное окно
- Отметка задачи как выполненной/невыполненной одним кликом
- Автоматическая фиксация времени выполнения задачи (completed_at)
- Удаление задачи с подтверждением через кастомный диалог (ConfirmDialog)
  - Перемещение в корзину: диалог "Переместить в корзину?"
  - Удаление из корзины: диалог "Удалить навсегда?" с предупреждением
  - Очистка корзины: диалог "Очистить корзину?" с предупреждением
  - Компонент: `frontend/src/components/ConfirmDialog.tsx`
  - Файлы: `frontend/src/routes/GtdTaskList.tsx`, `frontend/src/routes/Trash.tsx`
- Очистка корзины одной кнопкой с подтверждением действия (DELETE /api/tasks/trash/clear)
- Автоочистка корзины: задачи в корзине (gtd_status='trash') автоматически удаляются через 30 дней
  - Поле `trashed_at` в модели Task фиксирует время перемещения в корзину
  - Фоновая задача (APScheduler) запускается раз в сутки
  - Восстановление задачи очищает `trashed_at`
  - Метод: `TaskService.cleanup_old_trash(days=30)`
  - Job: `TaskScheduler._job_cleanup_old_trash`
  - Миграция: `alembic/versions/20260415_2040_add_trashed_at_to_tasks_695b4085a209.py`
- Файлы: `backend/app/api/tasks.py`, `backend/app/services/task_service.py`, `backend/app/scheduler.py`, `frontend/src/routes/Trash.tsx`
- Сворачивание/разворачивание списка выполненных задач
- Мгновенное обновление интерфейса без перезагрузки страницы

#### Управление пользователями (для администраторов)
- Панель управления пользователями доступна только администраторам
- Просмотр списка всех зарегистрированных пользователей
- Блокировка/разблокировка пользователей (блокировка отключает вход в систему)
- Удаление пользователей с подтверждением
- Администратор не может заблокировать или удалить самого себя
- Администраторы не могут быть заблокированы или удалены другими администраторами

#### Управление контекстами
- CRUD для контекстов (создание, редактирование, удаление)
- Привязка задач к контексту (context_id в tasks)
- Проверка уникальности имени контекста для каждого пользователя
- Цвет и иконка для каждого контекста
- Dropdown выбора контекста в форме редактирования задачи
- Страница управления контекстами (/contexts)
- API: GET/POST /api/contexts, GET/PUT/DELETE /api/contexts/{id}
- Файлы: `backend/app/schemas/context.py`, `backend/app/services/context_service.py`, `backend/app/api/contexts.py`, `frontend/src/hooks/useContexts.ts`, `frontend/src/routes/Contexts.tsx`
- Тесты: `backend/tests/test_contexts.py` (21 тест)

#### Управление тегами
- CRUD для тегов с цветовой маркировкой (создание, редактирование, удаление)
- M:N связь тегов и задач (таблица task_tags)
- Привязка/отвязка тегов к задачам через API
- Проверка уникальности имени тега для каждого пользователя
- Multi-select тегов (chips) в форме редактирования задачи
- Цветные chips тегов в списке задач
- Создание задач с тегами (tag_ids в TaskCreate/TaskUpdate)
- Страница управления тегами (/tags)
- API: GET/POST /api/tags, GET/PUT/DELETE /api/tags/{id}, POST/DELETE /api/tags/tasks/{task_id}/tags/{tag_id}
- Файлы: `backend/app/schemas/tag.py`, `backend/app/services/tag_service.py`, `backend/app/api/tags.py`, `frontend/src/hooks/useTags.ts`, `frontend/src/routes/Tags.tsx`
- Тесты: `backend/tests/test_tags.py` (29 тестов)

#### GTD функционал (базовая реализация)
- **Capture (Сбор задач):** быстрое создание задач в один клик
- **Engage (Выполнение):** отметка задач как выполненных
- **Организация:** автоматическое разделение на активные и завершённые задачи
- **Визуальная индикация:** чекбоксы и усиленное зачёркивание выполненных задач (line-through, decoration-2, приглушённый цвет текста, opacity карточки)
  - Работает во всех местах: списки задач (TaskListView), страница Tasks, модалка детали (TaskDetailModal), поиск (SearchOverlay)
  - Файлы: `frontend/src/components/TaskListView.tsx`, `frontend/src/routes/Tasks.tsx`, `frontend/src/components/TaskDetailModal.tsx`, `frontend/src/components/SearchOverlay.tsx`

#### GTD-статус Active ✅ (Реализовано 22.04.2026)
- Новый GTD-статус `active` — задачи с дедлайном, которые «в работе»
- Автоматический переход: при установке `due_date` задаче в `inbox` → статус меняется на `active`
- Снятие дедлайна не возвращает задачу из `active` обратно в `inbox`
- Из `active` доступны все стандартные переходы (inbox, next, waiting, someday, completed, trash)
- Отдельный пункт «Active» в сайдбаре (секция GTD, после Inbox) с badge-счётчиком
- Роут: `/active` → `GtdTaskList` с `gtdStatus="active"`
- Реализация на бэкенде: `TaskService.create_task()` и `TaskService.update_task()` автоматически переводят `inbox` → `active`
- Реализация на фронтенде: `useTasks.updateTask()` и `TaskEditModal.onSubmit()` автоматически переводят `inbox` → `active`
- Файлы: `backend/app/models/task.py`, `backend/app/services/task_service.py`, `backend/app/schemas/task.py`, `frontend/src/hooks/useTasks.ts`, `frontend/src/hooks/useGtdCounts.ts`, `frontend/src/components/AppLayout.tsx`, `frontend/src/components/TaskEditModal.tsx`, `frontend/src/components/TaskFilterPanel.tsx`, `frontend/src/router.tsx`, `frontend/src/routes/Active.tsx`

#### Индикатор состояния соединения ✅ (Реализовано 16.04.2026, обновлено 22.04.2026)
- Светофор-индикатор (StatusLight) рядом с названием «Todowka» в хедере и сайдбаре
- 6 состояний: загрузка (серый), онлайн (зелёный), офлайн (жёлтый), синхронизация (синий, пульсирует), ошибка (красный, пульсирует), очередь (оранжевый, пульсирует)
- Tooltip при наведении с текстовым описанием состояния
- Анимация пульсации для активных состояний (загрузка, синхронизация, ошибка, очередь)
- Комбинирует данные из useSyncStatus (isOnline/pendingCount/isSyncing из SyncProvider), useNotificationStore (SSE error) и BackendHealthChecker (/health ping)
- Компонент: `frontend/src/components/StatusLight.tsx`
- Интегрировано в AppLayout (мобильный хедер, мобильный сайдбар, десктопный сайдбар)

#### Пользовательский интерфейс
- Адаптивный дизайн для всех устройств (десктоп, планшет, телефон)
- Чистый и интуитивно понятный интерфейс
- Форма быстрого создания задач на главной странице
- Список задач с чекбоксами для выполнения
- Кнопки редактирования и удаления для каждой задачи
- Модальное окно редактирования задачи
  - Индикаторы загрузки при работе с данными
  - Обработка и отображение ошибок с возможностью повторной попытки
  - Автоматическое перенаправление на страницу входа для неавторизованных пользователей
- Настройки профиля с возможностью изменения часового пояса
  - Вкладка "Профиль" в настройках для редактирования имени, email и часового пояса
  - Список популярных часовых поясов для быстрого выбора
  - Возможность ввести любой IANA часовой пояс (например: Europe/Moscow, America/New_York)
  - Автоматическое обновление данных пользователя без перезагрузки страницы
  - Отображение часового пояса в списке пользователей (для администраторов)
  - Файлы: `frontend/src/routes/Settings.tsx`, `frontend/src/api/users.ts`, `frontend/src/stores/authStore.ts`
  - API: PATCH /api/users/me (с полем timezone в UserUpdate)

#### Закреплённая шапка и поиск по задачам ✅ (Реализовано 22.04.2026)
- Sticky header на мобильных устройствах — шапка всегда видна при прокрутке
- Десктопная верхняя панель с логотипом, полем поиска, уведомлениями и профилем
- Десктопный sidebar сдвигается ниже шапки (top-16)
- Полноэкранный SearchOverlay с live-поиском по задачам (debounce 300ms)
- Поиск использует существующий API: `GET /api/tasks?search=...&limit=20`
- Клик по результату поиска → переход на проект задачи
- Закрытие поиска: Escape или клик по backdrop
- Поддержка тёмной темы
- Файлы: `frontend/src/components/AppLayout.tsx`, `frontend/src/components/SearchOverlay.tsx`

#### Сохранение состояния UI между сессиями ✅ (Реализовано 13.04.2026)
- Автоматическое сохранение всех состояний UI в localStorage
- Сохранение сворачивания списка выполненных задач (Tasks.tsx)
- Сохранение состояния поля описания задачи (TaskListView.tsx)
- Сохранение раскрытия подзадач для каждой задачи отдельно (TaskListView.tsx)
- Сохранение активной вкладки в настройках (Settings.tsx)
- Сохранение состояния панели фильтров и поиска (TaskFilterPanel.tsx)
- Сохранение фильтров и поискового запроса между сессиями (useTaskFilter.ts)
- Кнопка сброса всех настроек интерфейса (Settings.tsx)
- Переиспользуемый хук useLocalStorage для работы с localStorage
- Все ключи localStorage имеют префикс `ui-`
- Файлы: `frontend/src/hooks/useLocalStorage.ts`, `frontend/src/hooks/useTaskFilter.ts`, `frontend/src/routes/Tasks.tsx`, `frontend/src/routes/Settings.tsx`, `frontend/src/components/TaskListView.tsx`, `frontend/src/components/TaskFilterPanel.tsx`

#### Видимость активных фильтров ✅ (Реализовано 16.04.2026)
- Бейдж с количеством активных фильтров на кнопке "Фильтры" (в развёрнутом состоянии)
- Бейдж на иконке поиска (в свёрнутом состоянии) — виден сразу при загрузке страницы
- Кнопка "Сбросить" для быстрого сброса всех фильтров одним кликом (видна в обоих состояниях)
- Подсчёт активных фильтров: контекст, область, проект, тег, поиск, сортировка, дедлайн (от/до)
- Исправлен баг: due_date_from/due_date_to добавлены в TaskFilters и buildQueryString
- Решение проблемы: пользователь видит, что фильтры активны, даже если они были сохранены в localStorage
- Файлы: `frontend/src/hooks/useTaskFilter.ts`, `frontend/src/components/TaskFilterPanel.tsx`, `frontend/src/hooks/useTasks.ts`

#### Палитра цветов для контекстов, проектов, областей, тегов
- Визуальная палитра (color picker) для выбора цвета при создании/редактировании контекстов, проектов, областей и тегов
- 16 предустановленных цветов для быстрого выбора
- Ручной ввод HEX-кода (#RRGGBB) через текстовое поле
- Кнопка «Сбросить цвет» для удаления цвета
- Валидация формата HEX на фронтенде (Zod) и бэкенде (Pydantic pattern)
- Компонент: `frontend/src/components/ColorPickerField.tsx`
- Библиотека: `react-colorful`

#### Local-first офлайн-режим на Dexie.js ✅ (Реализовано 18.04.2026, обновлено 22.04.2026)
- Dexie.js (IndexedDB) — единственный источник истины на клиенте, React Query удалён
- Full offline CRUD: задачи, проекты, области, контексты, теги — все операции работают без сети
- SyncEngine: initialSync при логине, фоновый pull каждые 15 мин, push при восстановлении сети
- **Реактивная отправка (push):** Dexie-хук на таблицу `mutations` автоматически запускает `push()` через 2 сек debounce после любого локального изменения — данные уходят на сервер без обновления страницы
- **Реактивное получение (pull):** SyncSSEListener подписывается на `/api/sse/sync` и запускает `pull()` через 1.5 сек debounce при получении SSE-событий об изменениях на сервере (task_updated, task_created и др.)
- LWW (Last-Writer-Wins) conflict resolution: серверная версия приоритетнее при равных updatedAt
- Soft-delete: записи помечаются `_syncStatus='deleted'`, исключаются из запросов
- Мутации записываются в таблицу `mutations` для offline-очереди, отправляются при reconnect
- Дедупликация мутаций: payload нескольких update-мутаций для одной сущности объединяются (merge), а не отбрасываются; update + toggle/move отправляются вместе
- Backend: принимает client-provided UUID (id в TaskCreate/ProjectCreate/AreaCreate/ContextCreate/TagCreate)
- Автоматическая очистка Dexie при logout (по userId)
- `httpClient.ts` упрощён: убраны offline queue, GET cache, toasts — только JWT auth + 401 refresh
- Файлы: `frontend/src/db/database.ts`, `frontend/src/db/syncEngine.ts`, `frontend/src/db/conflictResolution.ts`, `frontend/src/db/mappers.ts`, `frontend/src/db/hooks.ts`, `frontend/src/db/init.ts`, `frontend/src/db/migration.ts`
- Компоненты: `frontend/src/components/SyncProvider.tsx` (оркестратор синхронизации: Dexie-хук push + SSE-подписка pull + контекст)
- Хуки: `useDexieQuery`, `useOnlineStatus` (из `frontend/src/db/hooks.ts`), `useSyncStatus` (из SyncProvider)
- Удалены: React Query (`@tanstack/react-query` и сопутствующие пакеты), `idb`, `queryClient.ts`, `useOfflineQueue.ts`, `useLocalTaskChanges.ts`, `localTaskChanges.ts`, `indexedDB.ts`, `sseSyncManager.ts`, `syncStore.ts`, `useSyncSSE.ts`, `SyncIndicator.tsx`
- Тесты: `frontend/src/db/__tests__/conflictResolution.test.ts` (7 тестов), `frontend/src/db/__tests__/mappers.test.ts` (11 тестов)

#### Progressive Web App (PWA)
- Установка приложения на устройство (настольное или мобильное)
- Офлайн-режим для просмотра ранее загруженных задач
- Автоматическое кэширование ресурсов приложения
- Баннер приглашения к установке при поддержке браузером
- Запуск в отдельном окне (standalone режим)

#### Офлайн-режим с локальным сохранением изменений ✅ (Реализовано 16.04.2026, обновлено 22.04.2026)
- Переписано на local-first архитектуру с Dexie.js (см. секцию "Local-first офлайн-режим на Dexie.js")
- Dexie (IndexedDB) — единственный источник данных на клиенте
- Full offline CRUD через Dexie таблицы с автоматической синхронизацией
- SyncEngine: Dexie-хук → debounce push 2 сек, SSE sync → debounce pull 1.5 сек, фоновый pull каждые 15 мин
- LWW conflict resolution при конфликтах
- Удалены: React Query, старая offline-очередь, localTaskChanges, idb
- Файлы: `frontend/src/db/` (database.ts, syncEngine.ts, conflictResolution.ts, mappers.ts, hooks.ts, init.ts, migration.ts)

#### Уведомления и Real-time синхронизация ✅ (Реализовано 15.04.2026, обновлено 19.04.2026)

**Браузерные уведомления для напоминаний ✅ (Реализовано 15.04.2026, обновлено 22.04.2026)**
- Показ напоминаний как системных уведомлений браузера (Browser Notifications API)
- Запрос разрешения на показ уведомлений при первом включении
- Переключатель вкл/выкл браузерных уведомлений в настройках (вкладка «Общие»)
- Обработка случаев: браузер не поддерживает уведомления, уведомления заблокированы
- Предупреждение о блокировке показывается всегда, когда permission === 'denied' (независимо от состояния enabled)
- Тост-уведомление при неудачной попытке включить (разрешение не получено или заблокировано)
- Автоматическая синхронизация состояния permission при возврате на вкладку (focus/visibilitychange)
- Уведомления показываются при получении SSE-события `due_reminder` (напоминание о задаче)
- Клик по уведомлению переносит на страницу задачи
- Автозакрытие уведомления через 10 секунд
- Настройка сохраняется в localStorage (`ui-browser-notifications-enabled`)
- Файлы: `frontend/src/utils/browserNotifications.ts`, `frontend/src/hooks/useBrowserNotifications.ts`, `frontend/src/components/NotificationProvider.tsx`, `frontend/src/routes/Settings.tsx`

**Алгоритм работы системы уведомлений:**

1. **Планировщик напоминаний** запускается каждую минуту:
   - `ReminderService.find_due_tasks()` находит задачи, которые требуют напоминания
   - Возвращает `list[tuple[Task, int | None]]` — задача + offset (или None для reminder_time)
   - Для каждой задачи вычисляется время напоминания:
     - **Режим 1 (конкретное время):** `reminder_time` в день `due_date`
       - Timezone-aware клэмпинг: используется `due_date_local.time()` вместо UTC
       - Если `reminder_time > due_local.time()`, клэмпится до времени дедлайна
     - **Режим 2 (множественные смещения):** `reminder_offsets=[5, 60, 1440]` — каждый offset срабатывает независимо
       - Отправленные offsets отслеживаются в `sent_reminder_offsets` (JSON-колонка)
       - Каждый offset срабатывает ровно один раз
       - `reminder_fired=True` только когда ВСЕ offsets отправлены
   - SQL-фильтр `or_(reminder_time IS NOT NULL, reminder_offsets IS NOT NULL)` исключает задачи без напоминаний
   - Per-task commit/rollback в try/except
   - `max_instances=1` для всех scheduler jobs предотвращает параллельные tick'и

2. **SSE (Server-Sent Events) для real-time доставки:**
   - Фронтенд подключается к `GET /api/sse/notifications`
   - При получении события SSE → `NotificationStore.refetch()` обновляет список
   - Колокольчик показывает `unreadCount` из API-ответа
   - Бесконечный реконнект с exponential backoff (1s → 2s → 4s → ... → 30s cap)
   - Проверка `navigator.onLine` — не пытаться реконнект offline
   - `visibilitychange` listener — реконнект при возврате на вкладку
   - Adaptive polling fallback (30s → 60s → 120s) активируется при SSE down > 30 секунд
   - Polling деактивируется при восстановлении SSE

3. **Recovery при перезапуске сервера:**
   - `_job_reminder_recovery()` — one-shot job при старте, отправляет все пропущенные напоминания
   - Использует `find_due_tasks()` для автоматического обнаружения past-due reminders

4. **EventBus с overflow-обработкой:**
   - Очередь увеличена с 10 до 50 событий
   - При переполнении отправляется сигнал `queue_overflow` → клиент делает полный `refetch()`

3. **Отображение времени уведомления:**
   - Формат абсолютного времени: `ДД.ММ.ГГГГ ЧЧ:ММ:СС`
   - Используется `delivered_at` (время отправки), если есть, иначе `created_at`
   - Время отображается в локальной timezone пользователя через `toLocaleString()`

**Примеры работы:**

**Пример 1: Напоминание с конкретным временем**
```
Пользователь создаёт задачу:
  title: "Встреча с клиентом"
  due_date: 2026-04-16 14:00
  reminder_time: 09:00

15 апреля 2026, 09:00 (UTC):
  Планировщик находит задачу
  Создаётся уведомление:
    type: "due_reminder"
    message: "Напоминание о задаче 'Встреча с клиентом'"
    is_read: false
    delivered_at: 2026-04-15 06:00:00 UTC
  SSE событие отправляется на фронтенд
  Колокольчик показывает "1"
  Пользователь видит: "15.04.2026 09:00:00 Напоминание о задаче 'Встреча с клиентом'"
```

**Пример 2: Напоминание со смещением**
```
Пользователь создаёт задачу:
  title: "Дедлайн отчёта"
  due_date: 2026-04-15 16:00
  reminder_offsets: [15]  (за 15 минут)

15 апреля 2026, 15:45 (UTC):
  Планировщик вычисляет: 16:00 - 15 минут = 15:45
  Создаётся уведомление
  SSE событие доставляется в реальном времени
  Колокольчик показывает "1"
```

**Пример 3: Клик по уведомлению**
```
Пользователь кликает на уведомление:
  → PATCH /api/notifications/{id}/read
  → Уведомление помечается как is_read=true
  → Колокольчик обновляется: "1" → "0"
  → Автоматическое перенаправление: /tasks?editTaskId={task_id}
```

**Техническая реализация:**

**Бэкенд:**
- `ReminderService.send_reminder()` — создание уведомления и отправка события
- `event_bus.publish(channel, event_type, data)` — асинхронная шина событий
- `GET /api/notifications` — получение списка с `unread_count`
- `GET /api/sse/notifications` — SSE поток уведомлений (timeout 30s, heartbeat)
- Модель `Notification`: `is_read` (boolean), `delivered_at` (datetime), `expires_at` (datetime)
- Кастомный сериализатор datetime для ISO формата с timezone

**Фронтенд:**
- `NotificationBell` — компонент с badge непрочитанных
- `NotificationStore` — Zustand store для управления состоянием
- `SSEManager` — менеджер SSE подключений с авто-reconnect
- `formatTime(dateStr, deliveredAtStr)` — форматирование времени в локальной timezone
- URL для SSE в dev: `http://localhost:8000/api/sse/notifications`
- URL для SSE в prod: `{origin}/api/sse/notifications`

**API эндпоинты:**
- `GET /api/notifications` — список уведомлений (параметры: unread_only, limit, offset)
- `PATCH /api/notifications/{id}/read` — отметить как прочитанное
- `PATCH /api/notifications/read-all` — отметить все как прочитанные
- `DELETE /api/notifications/{id}` — удалить уведомление
- `GET /api/sse/notifications` — SSE поток уведомлений
- `GET /api/sse/sync` — SSE поток синхронизации задач (фронтенд подключён через SyncSSEListener в SyncProvider)

**Файлы:**
- Бэкенд: `backend/app/services/reminder_service.py`, `backend/app/api/notifications.py`, `backend/app/api/sse.py`, `backend/app/event_bus.py`, `backend/app/models/notification.py`, `backend/app/schemas/notification.py`, `backend/app/scheduler.py`
- Фронтенд: `frontend/src/components/NotificationBell.tsx`, `frontend/src/routes/Notifications.tsx`, `frontend/src/stores/notificationStore.ts`, `frontend/src/services/sseManager.ts`, `frontend/src/utils/notificationUtils.tsx`, `frontend/src/components/NotificationProvider.tsx`

**Тесты:**
- Бэкенд: 26 тестов в `tests/test_reminder_service.py`, 11 тестов в `tests/test_notifications_api.py`, 3 теста в `tests/test_scheduler.py`, 2 теста в `tests/test_dedup.py`
- Фронтенд: тесты SSE/polling/eventbus в `frontend/src/services/__tests__/ssePolling.test.ts`

#### Напоминания задач с конкретным временем ✅ (Реализовано 14.04.2026)
- Два режима напоминаний: конкретное время дня или смещение от дедлайна
- Режим "конкретное время": напоминать в указанное время (например, 09:00) в день дедлайна
- Режим "смещение от дедлайна": напоминать за X минут/часов/дней до дедлайна (за 5 мин, 15 мин, 1 час, 1 день)
- Поле reminder_time (TIME) в модели Task для хранения конкретного времени напоминания
- Компонент ReminderEditor с переключением между режимами
- Иконка 🔔 в списке задач для указания наличия активного напоминания
- Обновлена логика ReminderService для работы с reminder_time
- Напоминания создаются в reminder_time дня due_date (если reminder_time > due_date, то за день до)
- **Автоматический сброс напоминания при срабатывании**: когда напоминание отправлено, иконка колокольчика исчезает, галочка «Напоминание» снимается. При изменении напоминания пользователем — колокольчик появляется снова
  - Поле `reminder_fired` (bool) в модели Task — True после срабатывания, False при редактировании
  - Условие отображения колокольчика: `(reminder_time || reminder_offsets) && !reminder_fired`
  - При обновлении reminder_time или reminder_offsets через API — `reminder_fired` автоматически сбрасывается в False
  - SSE-событие `task:reminder-fired` триггерит refetch задач на фронтенде
- Миграция: alembic/versions/20260414_1113_add_reminder_time_field_42dc15b81a10.py
- Миграция (reminder_fired): alembic/versions/20260415_2120_add_reminder_fired_to_task_5e55c2ba49f5.py
- Файлы: `backend/app/models/task.py`, `backend/app/schemas/task.py`, `backend/app/services/reminder_service.py`, `backend/app/services/task_service.py`, `backend/app/services/recurrence_service.py`, `frontend/src/components/ReminderEditor.tsx`, `frontend/src/hooks/useTasks.ts`, `frontend/src/stores/notificationStore.ts`
- Линтеры и type checking: ruff (backend) и ESLint + TypeScript (frontend) без ошибок

---

### Техническая реализация

#### Аутентификация и авторизация (Backend)
- Access-токен (истекает через 15 минут) хранится в памяти браузера
- Refresh-токен (истекает через 7 дней) хранится в HttpOnly cookies с путём /api/auth
- Автоматическое обновление токена при ответе 401 с queue-механизмом для нескольких одновременных запросов
- Получение текущего аутентифицированного пользователя (GET /api/auth/me)
- Защищённые маршруты, требующие аутентификации
- Проверка лимита пользователей при регистрации (max_users)
- GET /api/config - получение конфигурации с полем registration_available
- Graceful handling 401 errors when fetching current user without showing error messages
- Проверка is_admin и is_blocked при получении текущего пользователя и входе в систему

#### API (Backend & Frontend integration)
- Health check endpoint (GET /health) с проверкой в docker-compose
- Корень API (GET /api/) с информацией о доступных эндпоинтах
- GET /api/tasks - список задач с пагинацией (limit 1-100, offset >= 0)
- POST /api/tasks - создание новой задачи
- GET /api/tasks/{id} - получение деталей задачи (включая completed_at)
- PUT /api/tasks/{id} - обновление задачи
- PATCH /api/tasks/{id}/toggle - переключение статуса выполнения с автоматическим заполнением/очисткой completed_at
- DELETE /api/tasks/{id} - удаление задачи
- GET /api/stats - статистика с использованием completed_at для подсчёта выполненных за период
- GET /api/users - список всех пользователей (только для администраторов)
- PATCH /api/users/{id}/block - блокировка пользователя (только для администраторов)
- PATCH /api/users/{id}/unblock - разблокировка пользователя (только для администраторов)
- DELETE /api/users/{id} - удаление пользователя (только для администраторов)
- Swagger UI по адресу `/api/docs`
- ReDoc по адресу `/api/redoc`
- Автоматически генерируемая документация OpenAPI
- Интерактивное тестирование API
- HTTP клиент с автоматическим обновлением токена
- Обработка ошибок и сетевых запросов

#### Frontend архитектура
- React 19 с хуками и компонентным подходом
- TypeScript для типобезопасности
- Vite для быстрой разработки и сборки
- React Router v7 для навигации и защищённых маршрутов
- Zustand для глобального состояния (аутентификация, тосты)
- Dexie.js (IndexedDB) для локальных данных с реактивными запросами через useLiveQuery
- SyncEngine для синхронизации с бэкендом: Dexie-хук → debounce push, SSE sync → debounce pull, LWW conflict resolution
- React Hook Form для обработки форм
- Zod для валидации схем на клиенте
- Tailwind CSS для utility-first стилизации
- Адаптивный дизайн для всех размеров экранов
- Кастомный HTTP клиент с JWT auth и 401 refresh
- Кастомный хук useTasks для управления задачами (через Dexie)
- Кастомный хук useConfig для получения конфигурации приложения
- Автоматическое перенаправление с регистрации при достижении лимита пользователей

#### Progressive Web App (PWA)
- Манифест приложения с иконками и цветами
- Service worker для офлайн-режима
- Кэширование статических ресурсов (стратегия CacheFirst)
- Кэширование API ответов (стратегия NetworkFirst, 100 записей, 5 минут)
- Компонент приглашения к установке (InstallPrompt)
- Auto-update стратегия для service worker

#### Безопасность
- Хеширование паролей с bcrypt и salt
- JWT-токены, подписанные алгоритмом HS256
- Cookie-only аутентификация: access и refresh токены хранятся только в httpOnly cookies
  - Токены НЕ выдаются в JSON-ответе (предотвращение утечки через XSS)
  - httpOnly cookies недоступны из JavaScript
  - SameSite=lax для защиты от CSRF при сохранении навигации с внешних сайтов
  - Secure флаг автоматически включается в production
- Проверка is_active при логине, refresh токене и get_current_user
- Проверка is_blocked при логине, refresh токене и get_current_user
- Защищённые API-эндпоинты для управления пользователями (только администраторы)
- Валидация email через EmailStr и email-validator (backend + frontend)
- Валидация пароля: минимум 8 символов, максимум 100 символов (backend и frontend schemas)
  - Поддержка Unicode-паролей: кириллица, арабский, китайский, японский и другие языки
  - Заглавная буква: проверяется через `str.isupper()` — поддерживает любой алфавит с регистром (латиница, кириллица, греческий и т.д.)
  - Спецсимвол: проверяется через Unicode-категории P (Punctuation) и S (Symbol) — любые спецсимволы мировых языков
  - Цифра: `\d` — арабские цифры (0-9)
  - Frontend: `\p{Lu}` (Unicode uppercase) и `[^\p{L}\p{N}]` (Unicode special) с флагом `u`
  - Файлы: `backend/app/schemas/user.py`, `backend/app/schemas/auth.py`, `frontend/src/routes/Register.tsx`
- Валидация username: минимум 3, максимум 50 символов
- Конфигурация CORS для разрешённых источников
- SQLAlchemy ORM с параметризованными запросами (предотвращение SQL-инъекций)
- Встроенная защита от XSS в React
- Refresh token blacklist для предотвращения повторного использования отозванных токенов
  - Каждому refresh токену присваивается уникальный JTI (JWT ID)
  - При logout refresh токен добавляется в blacklist
  - При успешном refresh старый токен добавляется в blacklist (rotation)
  - Повторное использование отозванного токена возвращает HTTP 401
  - Конфигурируется через переменную окружения REFRESH_TOKEN_ROTATION_ENABLED (true по умолчанию)
  - Модель RevokedToken в базе данных для хранения отозванных токенов
  - Миграция: alembic/versions/20260410_1503_66f131828079_add_revoked_tokens_table.py
  - Тесты: tests/test_revoked_tokens.py
- Rate limiting для предотвращения brute-force атак:
  - POST /api/auth/login — 3 попытки в минуту с одного IP
  - POST /api/auth/register — 3 регистрации в час с одного IP
  - Конфигурируется через переменные окружения LOGIN_RATE_LIMIT и REGISTER_RATE_LIMIT
  - Реализовано с помощью slowapi библиотеки
  - Поддержка X-Forwarded-For для корректного определения IP за прокси
  - Понятные сообщения об ошибках rate limiting на фронтенде (HTTP 429)
- Защита от брутфорса с блокировкой аккаунта:
  - После 5 неверных попыток входа аккаунт блокируется на 15 минут
  - Все ошибочные ответы идентичны: 401 "Incorrect username or password" (без раскрытия информации)
  - Успешный вход сбрасывает счётчик неудачных попыток
  - Конфигурируется через LOGIN_MAX_FAILED_ATTEMPTS и LOGIN_LOCKOUT_MINUTES
  - Поля: failed_login_attempts, locked_until в модели User
- Bearer token fallback полностью удалён — авторизация только через httpOnly cookie (нет вектора атаки через XSS)
- Восстановление сессии при загрузке приложения (cookie-based, без localStorage токена)
- Синхронизация logout между вкладками через storage event
- Валидация SECRET_KEY: ошибка запуска в production со значением по умолчанию
- console.log/warn/error в notificationStore обёрнуты в import.meta.env.DEV — нет утечки информации в production console
- /api/auth/* исключено из кэширования Workbox (PWA)
- Логирование user_id вместо фрагментов токена

#### Архитектура бэкенда
- FastAPI для высокопроизводительного API
- Паттерны async/await во всём коде
- Слоистая архитектура (API, Services, Models, Schemas)
- Внедрение зависимостей для сессий базы данных
- Pydantic v2 для валидации данных
- SQLAlchemy 2.0 с поддержкой async
- База данных SQLite в режиме WAL

#### База данных и миграции
- База данных SQLite с UUID первичными ключами
- Alembic для миграций базы данных
- Асинхронные операции с базой данных
- Модели User, Task и RevokedToken с отношениями (один ко многим)
- Автоматический commit/rollback в зависимостях БД
- Поле completed_at в таблице tasks для фиксации времени выполнения задачи
- Композитный индекс ix_tasks_user_id_is_completed для оптимизации запросов
- Cascade delete при удалении пользователя
- Таблица revoked_tokens для хранения отозванных refresh токенов (JTI + revoked_at)

#### Деплой и DevOps
- Контейнеризация с Docker
- Мультиконтейнерная настройка с Docker Compose
- Healthcheck в docker-compose (каждые 30s, 3 попытки)
- Docker volume backend-data для персистентности БД
- Nginx как reverse proxy с gzip-сжатием и кэшированием статики
- CI/CD пайплайн с GitHub Actions
- Автоматический линтинг и проверка типов
- Автоматическое тестирование (backend: pytest, frontend: vitest)
- Конфигурация переменных окружения
- Нативный деплой (без Docker) на сервер с nginx
  - Frontend отдаётся nginx как статика (vite build → dist/)
  - Backend работает как systemd сервис (uvicorn на 127.0.0.1:8000, не доступен снаружи)
  - Nginx проксирует /api/ и /health на backend
  - Домен todowka.nn-88-nn.ru
  - Файлы: `deploy/nginx.conf`, `deploy/todowka-backend.service`, `deploy/deploy.sh`

#### Тестирование
- Юнит-тесты бэкенда с pytest
- Тесты фронтенда с vitest
- Тестирование API-эндпоинтов
- Тестирование компонентов
- Фикстуры для тестов (auth_user1, auth_user2, task1)
- Переопределение secret_key в тестовой среде
- Проверки изоляции данных между пользователями

#### Качество кода
- Backend: Ruff для линтинга и проверки типов
- Frontend: ESLint и TypeScript
- Pre-commit хуки (через CI/CD)
- Автоматическое форматирование кода

---

## Как документировать новые возможности

При добавлении новой функции в Todowka обновите этот файл, следуя этим инструкциям:

### Формат записи возможности

```markdown
### [Название категории]
- [Описание возможности]
- [Дополнительные сведения о реализации]
- [Связанные компоненты/эндпоинты/файлы]
```

### Информация для включения

Для каждой новой возможности задокументируйте:

1. **Название возможности**: Чёткое, описательное название
2. **Категория**: Группировка с родственными возможностями (например, Аутентификация, UI, Безопасность и т.д.)
3. **Описание**: Что делает возможность и её назначение
4. **Детали реализации**:
   - Ключевые изменённые/созданные файлы
   - Добавленные API-эндпоинты (если есть)
   - Изменения схемы базы данных (если есть)
   - Добавленные UI-компоненты (если есть)
5. **Конфигурация**: Новые переменные окружения или настройки
6. **Тестирование**: Как тестируется возможность

### Пример записи возможности

```markdown
### Категории задач
- Организация задач по категориям (Работа, Личное, Покупки и т.д.)
- Добавлено поле category в модель и схему Task
- Обновлены формы создания/редактирования задач для выбора категории
- Добавлена фильтрация задач по категории
- Файлы: `backend/app/models/task.py`, `frontend/src/components/TaskList.tsx`
- API: GET `/api/tasks?category=work`
- Миграция: `alembic/versions/xxxxx_add_category_to_tasks.py`
```

### Рекомендации

- **Будьте конкретны**: Используйте точный язык для описания того, что делает возможность
- **Упоминайте зависимости**: Указывайте, зависит ли возможность от других функций
- **Ссылайтесь на код**: Упоминайте конкретные файлы, когда это полезно
- **Будьте краткими**: Сосредоточьтесь на том, что делает возможность, а не как она была построена (если это не важно)
- **Обновляйте даты**: Рассмотрите возможность добавления даты или номера версии при добавлении возможностей
- **Группируйте логически**: Размещайте возможности в соответствующих категориях

### Используемые категории

При документировании возможностей используйте существующие категории, когда это уместно:
- Аутентификация и авторизация
- Управление задачами
- API
- Пользовательский интерфейс
- Progressive Web App (PWA)
- Безопасность
- Архитектура бэкенда
- Архитектура фронтенда
- База данных и миграции
- Деплой и DevOps
- Тестирование
- Качество кода

Создавайте новые категории только если они не подходят к существующим.

---

## Итерация 2: GTD-методология (Планирование)

### Планируемые возможности

#### Контексты ✅ (Реализовано 10.04.2026)
- CRUD для контекстов (Home, Office, Phone и т.д.)
- Привязка задач к контексту (context_id в tasks)
- Фильтрация задач по контексту
- Цвет и иконка для каждого контекста
- Проверка уникальности имени

#### Области ответственности ✅ (Реализовано 10.04.2026)
- CRUD для областей (Здоровье, Финансы, Карьера и т.д.)
- Привязка задач и проектов к области (area_id)
- Проверка уникальности имени области для каждого пользователя
- Описание и цвет для каждой области
- Dropdown выбора области в форме редактирования задачи
- Страница управления областями (/areas)
- API: GET/POST /api/areas, GET/PUT/DELETE /api/areas/{id}
- Файлы: `backend/app/schemas/area.py`, `backend/app/services/area_service.py`, `backend/app/api/areas.py`, `frontend/src/hooks/useAreas.ts`, `frontend/src/routes/Areas.tsx`
- Тесты: `backend/tests/test_areas.py` (21 тест)

#### Теги ✅ (Реализовано 11.04.2026)
- CRUD для тегов с цветовой маркировкой
- M:N связь тегов и задач (таблица task_tags)
- Multi-select тегов в форме задачи
- Привязка/отвязка тегов через API
- Цветные chips тегов в списке задач
- Фильтрация задач по тегам (запланировано на Этап 6)

#### Проекты ✅ (Реализовано 11.04.2026)
- CRUD для проектов с прогресс-баром
- Привязка задач к проекту (project_id)
- Автоматический подсчёт прогресса (tasks_total, tasks_completed, progress_percent)
- Привязка проекта к области (area_id)
- Архивация проектов (is_active)
- Страница списка проектов (/projects) с карточками и прогресс-барами
- Страница деталей проекта (/projects/:id) с прогрессом и списком задач
- Dropdown выбора проекта в форме редактирования задачи
- Отображение названия проекта в карточке задачи с цветовым индикатором и кликабельной ссылкой на проект
- API: GET/POST /api/projects, GET/PUT/DELETE /api/projects/{id}, GET /api/projects/{id}/tasks
- ProjectBriefResponse в TaskResponse (id, name, color, is_active)
- Файлы: `backend/app/schemas/project.py`, `backend/app/services/project_service.py`, `backend/app/api/projects.py`, `frontend/src/hooks/useProjects.ts`, `frontend/src/routes/Projects.tsx`, `frontend/src/routes/ProjectDetail.tsx`
- Тесты: `backend/tests/test_projects.py` (29 тестов)

#### GTD-статусы ✅ (Реализовано 11.04.2026)
- Статусы: inbox, next, waiting, someday, completed, trash
- Поле gtd_status в модели tasks (default: inbox)
- Перемещение задач между статусами (PATCH /api/tasks/{id}/move)
- Страницы для каждого GTD-статуса (/inbox, /next, /waiting, /someday, /completed, /trash)
- Счётчики задач по статусам в sidebar (GET /api/tasks/counts)
- Хук useGtdCounts() с автообновлением через кастомное событие todowka:tasks-changed
- Компонент GtdTaskList — универсальный список для всех GTD-статусов
- Тесты: `backend/tests/test_tasks.py` (7 тестов move_task + 1 тест counts)

#### Inbox — быстрый захват ✅ (Реализовано 11.04.2026 — частично)
- Inline-форма добавления задач на странице Inbox (input + Add)
- Задачи по умолчанию создаются с gtd_status=inbox
- Кнопки быстрого перемещения (→ Next, → Waiting, → Someday, → Trash)
- Inline-форма уточнения через расширенный TaskEditModal
- ~Quick Capture Bar~ — не реализовано, не планируется
- ~Клавиатурный шорткат (Ctrl+K)~ — не реализовано, не планируется

#### Подзадачи ✅ (Реализовано 11.04.2026)
- Иерархия задач (parent_task_id)
- Создание подзадач через API: POST /api/tasks/{id}/subtasks
- Получение подзадач: GET /api/tasks/{id}/subtasks
- Подсчёт подзадач: subtasks_count, subtasks_completed в TaskResponse
- GET /api/tasks — по умолчанию только корневые, ?include_subtasks=true для всех
- Каскадное удаление подзадач при удалении родительской задачи
- Хук useSubtasks(parentTaskId) — CRUD подзадач
- Раскрываемый список подзадач в карточке задачи: индикатор (3/5), toggle, добавление
- API: GET/POST /api/tasks/{id}/subtasks, GET /api/tasks?include_subtasks=true
- Файлы: `backend/app/services/task_service.py`, `backend/app/api/tasks.py`, `frontend/src/hooks/useSubtasks.ts`, `frontend/src/routes/GtdTaskList.tsx`
- Тесты: `backend/tests/test_tasks.py` (9 тестов подзадач)

#### Поиск и фильтрация ✅ (Реализовано 12.04.2026)
- Полнотекстовый поиск по title + description + notes (регистронезависимый, ILIKE)
- Комбинированные фильтры: GTD-статус, контекст, область, проект, тег, дедлайн (от/до)
- Сортировка: по позиции, дате создания, дедлайну, названию + asc/desc
- Панель фильтров с dropdowns, date range picker, кнопкой сброса
- Строка поиска с debounce 300ms, иконка лупы, кнопка очистки
- Dropdown сортировки + toggle asc/desc
- Сохранение фильтров в URL query params (shareable links)
- Подсветка найденного текста (HighlightText) в заголовках и описаниях задач
- 13 query params в GET /api/tasks (gtd_status, context_id, area_id, project_id, tag_id, is_completed, due_date_from, due_date_to, search, sort_by, sort_order, include_subtasks, limit/offset)
- 13 новых тестов: фильтрация по context/area/project/tag/is_completed/due_date_range, сортировка по title/due_date, комбинированные фильтры, case-insensitive поиск, поиск в description/notes
- Файлы: `frontend/src/components/TaskFilterPanel.tsx`, `frontend/src/hooks/useDebounce.ts`, `frontend/src/hooks/useTaskFilterSync.ts`
- Интегрировано в GtdTaskList и Tasks

#### Sidebar навигация ✅ (Реализовано 12.04.2026 — частично)
- GTD-секции с badges-счётчиками (Inbox, Next, Waiting, Someday)
- Completed и Trash с счётчиками
- Секция «Управление»: Проекты, Контексты, Области, Теги
- Профиль пользователя, Настройки, Выход
- Mobile: slide-over через бургер-меню
- Desktop: фиксированный sidebar (w-64)
- Компонент AppLayout с SidebarContent
- Хук useGtdCounts() для счётчиков
- ~Мини-прогрессбар у проектов~ — не реализовано, не планируется
- ~Desktop collapsible~ — не реализовано, не планируется

#### Расширенная форма задачи ✅ (Реализовано 12.04.2026)
- Поля: title, description, gtd_status, контекст, проект, область, дедлайн, теги, заметки
- GTD статус: select (inbox, next, waiting, someday, completed, trash)
- Контекст: dropdown с CRUD через useContexts()
- Проект: dropdown (только is_active) через useProjects()
- Область: dropdown через useAreas()
- Дедлайн: date input
- Заметки: textarea
- Теги: TagChips — multi-select с цветовой индикацией
- Zod валидация (title обязателен)
- Автозаполнение при редактировании (fetchTask)

#### Новые модели БД ✅ (Реализовано 10-11.04.2026)
- Таблица `contexts` (id, user_id, name, color, icon, created_at)
- Таблица `areas` (id, user_id, name, description, color, created_at)
- Таблица `tags` (id, user_id, name, color, created_at)
- Таблица `task_tags` (task_id, tag_id) — M:N связь
- Таблица `projects` (id, user_id, name, description, color, area_id, is_active, created_at, updated_at)
- Расширение `tasks` (gtd_status, context_id, area_id, project_id, parent_task_id, position, due_date, notes)
- 8 индексов для оптимизации запросов
- Миграции: 002_add_contexts_areas_tags, 003_add_projects, 004_extend_tasks_gtd

---

## История возможностей

*Последнее обновление: 19 апреля 2026 года*

**19 апреля 2026:**
- Исправление системы напоминаний (критические баги, v2)
  - BUG-1: Множественные `reminder_offsets` — добавлено поле `sent_reminder_offsets` (JSON) в Task, унифицированный return type `list[tuple[Task, int | None]]` в `find_due_tasks()`, условная установка `reminder_fired` только когда все offsets отправлены
  - BUG-2: Timezone-баг клэмпинга — сравнение `due_date_local.time()` вместо `due_date.time()`
  - BUG-3: Recovery job при старте сервера — одноразовый `_job_reminder_recovery` для отправки пропущенных напоминаний
  - BUG-4: Бесконечный SSE реконнект — убран лимит 5 попыток, exponential backoff (cap 30s), `visibilitychange`, `navigator.onLine`
  - BUG-5: Polling fallback при падении SSE — adaptive backoff 30s→60s→120s, автостарт/остановка
  - BUG-6: EventBus queue 10→50, overflow→`queue_overflow` сигнал→refetch на клиенте
  - BUG-7: SQL-фильтрация `or_(reminder_time, reminder_offsets)` вместо загрузки всех задач
  - BUG-7b: `max_instances=1` на всех scheduler jobs для предотвращения параллельных tick'ов
  - BUG-8: Информационный баннер в ReminderEditor вместо полной блокировки UI
  - BUG-10: `onclick` назначается до `await` в browserNotifications (race condition fix)
  - BUG-13: Удалён мёртвый код `should_send_reminder()`
  - BUG-14: Tuple unpacking в scheduler, `task.user` напрямую (без доп. запроса)
  - BUG-1b: Сброс обоих dedup-полей при обновлении reminder-полей в `update_task()`
  - BUG-1c: Внутренние поля защищены от API — удалены из `TaskUpdate`, guard в сервисе
  - Миграция: `20260419_2040_add_sent_reminder_offsets_to_tasks_226054cdbcf5.py`
  - Тесты: 19 новых тестов (reminder_service, scheduler, dedup, ssePolling)

**18 апреля 2026:**
- Перевод фронтенда на local-first архитектуру с Dexie.js (IndexedDB)
  - Dexie — единственный источник данных на клиенте, React Query полностью удалён
  - Full offline CRUD для задач, проектов, областей, контекстов, тегов
  - SyncEngine: initialSync, push/pull, LWW conflict resolution
  - Backend: client-provided UUID в TaskCreate/ProjectCreate/AreaCreate/ContextCreate/TagCreate
  - Очистка Dexie при logout, миграция со старых IDB баз
  - httpClient упрощён: убраны offline queue, GET cache, toasts
  - StatusLight переписан на useSyncStatus из SyncProvider
  - Удалены: @tanstack/react-query, idb, queryClient.ts, useOfflineQueue.ts, localTaskChanges.ts, sseSyncManager.ts, syncStore.ts
  - Файлы: frontend/src/db/ (database.ts, syncEngine.ts, conflictResolution.ts, mappers.ts, hooks.ts, init.ts, migration.ts)
  - Компоненты: SyncProvider.tsx
  - Тесты: conflictResolution.test.ts (7), mappers.test.ts (11), httpClient.test.ts (26)

**16 апреля 2026:**
- Добавлен индикатор состояния соединения (StatusLight) рядом с названием «Todowka»
  - 5 состояний: онлайн (зелёный), офлайн (жёлтый), синхронизация (синий), ошибка (красный), очередь (оранжевый)
  - Пульсирующая анимация для активных состояний
  - Tooltip при наведении
  - Компонент: `frontend/src/components/StatusLight.tsx`
  - Отображается в хедере и сайдбаре (мобильный и десктоп) "Офлайн режим" при недоступном бэкенде
  - React Query не ретрайит мутации при OfflineQueueError
  - Дедупликация тоста "Офлайн режим" — показывается однократно
  - Sync-очередь использует raw fetch для предотвращения повторного кьюинга
  - Убраны дублирующие тосты из OfflineBanner
  - Файлы: `frontend/src/lib/queryClient.ts`, `frontend/src/api/httpClient.ts`, `frontend/src/hooks/useOfflineQueue.ts`, `frontend/src/components/OfflineBanner.tsx`
- Добавлена видимость активных фильтров с индикатором количества
  - Бейдж с количеством активных фильтров на кнопке "Фильтры" (красный кружок с цифрой)
  - Кнопка "Сбросить" для быстрого сброса всех фильтров одним кликом
  - Кнопка сброса видна всегда, когда есть активные фильтры (независимо от состояния панели)
  - Подсчёт активных фильтров: контекст, область, проект, тег, поиск, сортировка, дедлайн (от/до)
  - Решение проблемы: пользователь видит, что фильтры активны, даже если они были сохранены в localStorage
  - Файлы: `frontend/src/hooks/useTaskFilter.ts`, `frontend/src/components/TaskFilterPanel.tsx`
  - Тесты: 16 тестов в TaskFilterPanel.test.tsx (все проходят)
  - Линтеры и type checking: без ошибок

**15 апреля 2026:**
- Добавлены браузерные уведомления для напоминаний (Browser Notifications API)
  - Системные уведомления браузера при получении напоминания о задаче
  - Запрос разрешения на показ уведомлений при первом включении
  - Переключатель в настройках (вкладка «Общие») с toggle-переключателем
  - Обработка: браузер не поддерживает / уведомления заблокированы / включены / отключены
  - Клик по уведомлению открывает модальное окно задачи, автозакрытие через 10 сек
  - Утилита: `frontend/src/utils/browserNotifications.ts`
  - Хук: `frontend/src/hooks/useBrowserNotifications.ts`
  - Интеграция: `NotificationProvider.tsx` слушает `task:reminder-fired` и показывает уведомление
- Добавлен автоматический сброс напоминания при срабатывании: колокольчик исчезает после отправки уведомления, галочка «Напоминание» снимается
  - Поле `reminder_fired` (bool, default=False) в модели Task
  - `ReminderService.send_reminder()` устанавливает `reminder_fired = True`
  - `TaskService.update_task()` сбрасывает `reminder_fired = False` при изменении reminder_time/reminder_offsets
  - Фронтенд: условие колокольчика `reminder && !reminder_fired`, ReminderEditor учитывает fired-статус
  - SSE-событие `task:reminder-fired` триггерит refetch задач для мгновенного обновления UI
  - Миграция: 20260415_2120_add_reminder_fired_to_task_5e55c2ba49f5.py
- Добавлена автоочистка корзины: задачи автоматически удаляются через 30 дней после перемещения в корзину
  - Поле `trashed_at` в модели Task (миграция 20260415_2040)
  - `TaskService.cleanup_old_trash(days=30)` — массовое удаление старых задач
  - `_job_cleanup_old_trash` в TaskScheduler запускается раз в сутки
  - `move_task()` ставит `trashed_at` при trash, очищает при восстановлении
- Добавлена кнопка «Очистить корзину» на странице корзины — удаление всех задач одним кликом с подтверждением
- Backend: endpoint DELETE /tasks/trash/clear, метод TaskService.clear_trash()
- Frontend: кнопка с spinner, confirm-диалог, обработка ошибок, обновление счётчиков после очистки
- Файлы: `backend/app/api/tasks.py`, `backend/app/services/task_service.py`, `frontend/src/routes/Trash.tsx`
- Реализован выбор часового пояса при первой авторизации
- Модальное окно TimezoneSetupModal появляется при первом входе, если timezone не установлен
- Список популярных часовых поясов для быстрого выбора
- Возможность ввести любой IANA часовой пояс
- Автоматическое сохранение выбранного часового пояса и перенаправление на задачи
- Интегрировано в Login и Register страницы

**16 апреля 2026:**
- Добавлено персистентное офлайн-редактирование задач с локальным сохранением изменений
  - Изменения задач сохраняются в IndexedDB при офлайн-режиме
  - При перезагрузке страницы локальные изменения сохраняются и применяются к задачам
  - Автоматическая синхронизация с бэкендом при восстановлении соединения
  - Индикатор "🔌 Офлайн" в форме редактирования задачи при отсутствии сети
  - Очистка локальных изменений после успешной синхронизации
  - Файлы: `frontend/src/lib/localTaskChanges.ts`, `frontend/src/hooks/useLocalTaskChanges.ts`, `frontend/src/hooks/useTasks.ts`, `frontend/src/hooks/useOfflineQueue.ts`, `frontend/src/components/TaskEditModal.tsx`
  - Интегрировано с существующей офлайн-очередью мутаций
- Добавлено модальное окно задачи из уведомлений
  - При клике на уведомление в панели уведомлений или на странице уведомлений показывается модальное окно со всеми параметрами задачи
  - Модальное окно отображает: заголовок, описание, GTD-статус, контекст, проект, область, дедлайн, напоминания, теги, заметки, подзадачи, даты создания и обновления
  - Даты и время отображаются в таймзоне пользователя
  - Кнопка «Редактировать» для перехода на страницу редактирования задачи
  - Кнопка «Закрыть» для закрытия модального окна
  - Файлы: `frontend/src/components/TaskDetailModal.tsx`, `frontend/src/components/NotificationBell.tsx`, `frontend/src/routes/Notifications.tsx`
  - Интегрировано в NotificationBell и Notifications страницы
- Исправлено обновление даты изменения задачи (updated_at)
  - Добавлено явное обновление `updated_at` в методах `update_task`, `move_task`, `toggle_task`, `reorder_task`
  - Теперь при любом изменении задачи дата и время обновления корректно сохраняются
  - Файл: `backend/app/services/task_service.py`
  - Тест: `backend/tests/test_tasks.py::test_update_task_updates_updated_at`
- Выбор часового пояса в настройках профиля
- Добавлена вкладка "Профиль" в настройки с формой редактирования имени, email и часового пояса
- Список популярных часовых поясов для быстрого выбора (Москва, Лондон, Нью-Йорк, Токио и др.)
- Возможность ввести любой IANA часовой пояс (например: Europe/Moscow, America/New_York)
- Автоматическое обновление данных пользователя без перезагрузки страницы через setCurrentUser
- Отображение часового пояса в таблице пользователей для администраторов
- Поле timezone уже существовало в модели User и схеме UserUpdate на бэкенде
- Обновлён API клиент users.ts с методом updateCurrentUser
- Обновлена документация в docs/features.md

**14 апреля 2026:**
- Реализованы напоминания задач с конкретным временем (reminder_time)
- Добавлен режим выбора между конкретным временем и смещением от дедлайна
- Обновлён ReminderEditor с radio-переключением и time input
- Поле reminder_time (TIME) добавлено в модель Task, схемы и сервисы
- Обновлена логика ReminderService для обработки reminder_time
- Миграция: 20260414_1113_add_reminder_time_field_42dc15b81a10.py
- Обновлена документация в docs/features.md

**13 апреля 2026:**
- Реализовано сохранение состояния UI между сессиями (Этап 1-7): хук useLocalStorage, сохранение всех UI-состояний
- Сохраняются: сворачивание задач, поле описания, раскрытие подзадач, активная вкладка, фильтры/поиск, состояние панели
- Добавлена кнопка сброса настроек интерфейса в настройках
- Все ключи localStorage имеют префикс `ui-` для лёгкой очистки
- Обновлена документация в docs/features.md

**12 апреля 2026 (Этап 8 — Финализация):**
- Написаны frontend тесты: AppLayout/Sidebar (15), TaskEditModal extended (23), TaskFilterPanel + HighlightText (16), Projects (16), Subtasks (17)
- Итого frontend: 236 тестов (12 файлов)
- Обновлены статусы в docs/features.md: GTD-статусы, Inbox, Sidebar, Extended Task Form, New DB Models отмечены как реализованные

**12 апреля 2026:**
- Реализован поиск и фильтрация (Этап 6): панель фильтров, поиск с debounce, сортировка, URL sync, highlight
- 13 новых тестов backend: фильтрация по context/area/project/tag/is_completed/due_date_range, сортировка, комбинированные фильтры, case-insensitive поиск
- Компоненты: TaskFilterPanel (панель фильтров + HighlightText), хуки useDebounce, useTaskFilterSync
- Добавлены due_date_from/due_date_to в TaskFilters и buildQueryString
- Интеграция в GtdTaskList и Tasks

**11 апреля 2026:**
- Реализованы подзадачи: иерархия задач, создание/получение через API, подсчёт (subtasks_count/subtasks_completed)
- Хук useSubtasks(parentTaskId), раскрываемый UI подзадач в карточке с toggle и добавлением
- 9 тестов подзадач (создание, список, counts, toggle, include_subtasks, cascade delete)
- GET /api/tasks по умолчанию возвращает только корневые задачи, ?include_subtasks=true для всех
- Параметр include_subtasks и поля subtasks_count/subtasks_completed в TaskResponse
- Реализовано управление проектами: CRUD API, хук useProjects, страницы /projects и /projects/:id, dropdown в форме задач
- 29 тестов для проектов (CRUD, уникальность, прогресс-бар, задачи проекта, права доступа)
- Прогресс-бар: автоматический подсчёт tasks_total, tasks_completed, progress_percent
- Страница деталей проекта с прогрессом и списком задач (активные/выполненные)
- Добавлено поле project_id в TaskCreate, TaskUpdate, TaskResponse
- Добавлен dropdown проекта в TaskEditModal
- Ссылка «Проекты» добавлена в навигацию (десктоп и мобильная)
- Реализовано управление тегами: CRUD API, хук useTags, страница /tags, multi-select chips в форме задач
- 29 тестов для тегов (CRUD, уникальность, привязка/отвязка к задачам, создание задач с тегами)
- Обновлён TaskService для работы с tag_ids при создании/обновлении задач
- Обновлён TaskResponse — включает список тегов для каждой задачи
- Цветные chips тегов отображаются в списке задач (активных и выполненных)

**10 апреля 2026:**
- Реализовано управление контекстами: CRUD API, хук useContexts, страница /contexts, dropdown в форме задач
- 21 тест для CRUD контекстов (создание, уникальность, пагинация, права доступа, удаление)
- Реализовано управление областями: CRUD API, хук useAreas, страница /areas, dropdown в форме задач
- 21 тест для CRUD областей (создание, уникальность, пагинация, права доступа, удаление)
- Добавлено поле completed_at в модель Task для точного отслеживания времени выполнения задачи
- Обновлена логика toggle_task для автоматического заполнения/очистки completed_at
- Статистика (GET /api/stats) теперь использует completed_at вместо updated_at для подсчёта выполненных задач за период
- Миграция: alembic/versions/20260410_1515_aa554e189f47_add_completed_at_to_tasks.py

Все перечисленные выше возможности реализованы на текущую дату.
