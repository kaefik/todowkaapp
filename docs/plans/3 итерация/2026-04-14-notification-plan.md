# План улучшения системы уведомлений

**Дата:** 14 апреля 2026
**Основание:** `docs/plans/3 итерация/2026-04-14-notification-analyze.md`
**Статус:** К реализации

---

## Архитектурные решения

| Решение | Выбор |
|---------|-------|
| SSE механизм | Event-driven через asyncio pub/sub (вместо polling каждую секунду) |
| Обновления на фронте | Только SSE, polling убрать |
| Авторизация SSE | Cookie-based (httpOnly cookie с access_token) |
| Дублирование SSE | NotificationProvider на уровне App (один экземпляр) |
| Тесты | Средний уровень (~30-40 тестов) |
| Rate limiting | До 3 SSE-соединений на пользователя |

---

## ~~Этап 1~~ — Backend: Event Bus (инфраструктура) ✅ ВЫПОЛНЕН

### 1.1 Создать `backend/app/event_bus.py` ✅

**Файл создан:** `backend/app/event_bus.py`

Реализован EventBus с:
- `subscribe(user_id)` → asyncio.Queue с maxlen=10
- `unsubscribe(user_id, queue)` — удаление подписки
- `publish(user_id, event_type, data)` — отправка во все очереди пользователя
- `get_subscriber_count(user_id)` — для rate limiting
- `cleanup_user(user_id)` — удаление всех подписок
- Singleton: `event_bus = EventBus()`

### 1.2 Интегрировать EventBus в scheduler ✅

**Файл изменён:** `backend/app/scheduler.py`

В `_job_send_due_reminders()` после успешного `send_reminder()` и `commit()`:
```python
from app.event_bus import event_bus
await event_bus.publish(str(user.id), "notification_created", {
    "notification_id": str(notification.id),
    "type": notification.type,
    "message": notification.message,
    "task_id": str(task.id) if task.id else None,
})
```

**Тестирование пройдено:** импорт, subscribe/unsubscribe/publish, queue full handling, cleanup

---

## Этап 2 — Backend: Cookie-based авторизация для SSE

### 2.1 Устанавливать access_token cookie при логине

**Файл:** `backend/app/security.py`

Добавить функции:
- `set_access_cookie(response, token)` — httpOnly cookie `access_token` на путь `/api/sse`, SameSite=strict, Secure
- `clear_access_cookie(response)` — удалить cookie

**Файл:** `backend/app/api/auth.py`

- В `login()` (строка 97): добавить `set_access_cookie(response, access_token)` после `set_refresh_cookie`
- В `refresh()` (строка 128): добавить `set_access_cookie(response, access_token)`
- В `logout()` (строка 199): добавить `clear_access_cookie(response)`

Параметры cookie:
```
key="access_token"
path="/api/sse"       # доступна только SSE-эндпоинтам
httponly=True
secure=True
samesite="strict"
max_age=settings.access_token_expire_minutes * 60
```

### 2.2 Создать SSE-зависимость для авторизации через cookie

**Файл:** `backend/app/dependencies.py`

Добавить:
```python
async def get_current_user_from_cookie(
    access_token: Annotated[str | None, Cookie()] = None,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> User:
```

Логика:
1. Сначала попробовать cookie `access_token` (для SSE)
2. Затем Authorization header (для обычных запросов — backward compatible)
3. Декодировать JWT, найти пользователя
4. Вернуть 401 если не валиден

### 2.3 Обновить SSE-эндпоинт

**Файл:** `backend/app/api/sse.py`

Заменить `Depends(get_current_user)` на `Depends(get_current_user_from_cookie)` в SSE-роутах.

---

## Этап 3 — Backend: Переписать SSE на event-driven

### 3.1 Переписать `GET /sse/notifications`

**Файл:** `backend/app/api/sse.py`

Заменить polling-генератор на event-driven:

```python
@sse_router.get("/notifications")
async def notification_stream(current_user=Depends(get_current_user_from_cookie)):
    # Rate limiting
    if event_bus.get_subscriber_count(str(current_user.id)) >= 3:
        raise HTTPException(429, "Too many SSE connections")

    async def event_generator():
        queue = event_bus.subscribe(str(current_user.id))
        try:
            # Отправить heartbeat каждые 30с
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30)
                    yield {"event": "notification", "data": json.dumps(event)}
                except asyncio.TimeoutError:
                    yield {"event": "heartbeat", "data": ""}
        finally:
            event_bus.unsubscribe(str(current_user.id), queue)

    return EventSourceResponse(event_generator())
```

Ключевые отличия от текущей реализации:
- Нет DB-сессии внутри генератора (нет утечки)
- Нет polling (ждёт событие через queue.get())
- Heartbeat каждые 30с (для поддержания соединения)
- Rate limiting через subscriber count

### 3.2 Обновить `GET /sse/sync`

Аналогично: подписка на `event_bus.publish(user_id, "task_updated", ...)`.

Публиковать событие при любом изменении задач (в task API после commit).

### 3.3 Убрать зависимость SSE от DB-сессии

SSE-эндпоинты больше не должны принимать `db: AsyncSession = Depends(get_db)`. Авторизация через cookie не требует DB в момент установки SSE (токен содержит user_id, пользователь уже проверен).

**НО:** для начальной загрузки (отправка непрочитанных при подключении) можно сделать один запрос до входа в цикл, затем закрыть сессию.

---

## Этап 4 — Backend: Исправление критических багов

### 4.1 Устранить двойной commit в scheduler

**Файл:** `backend/app/services/reminder_service.py`

В `send_reminder()` (строка 68-96):
- Заменить `await self.db.commit()` на `await self.db.flush()`
- `flush()` запишет в БД без commit — данные доступны по ID, но транзакция не завершена

**Файл:** `backend/app/scheduler.py`

В `_job_send_due_reminders()` (строка 93-127):
- Один `await db.commit()` в конце цикла обработки всех задач
- В `except`: `await db.rollback()` откатит всё, включая `last_reminder_sent_at` — это правильно, т.к. уведомление не создано

### 4.2 Оптимизировать `find_due_tasks()` — фильтрация в SQL

**Файл:** `backend/app/services/reminder_service.py`

Перенести проверку `should_send_reminder()` в SQL-запрос:

```python
result = await self.db.execute(
    select(Task).options(selectinload(Task.user))
    .where(
        Task.due_date.isnot(None),
        Task.is_completed == False,
        or_(
            Task.last_reminder_sent_at.is_(None),
            Task.last_reminder_sent_at <= datetime.now(UTC) - timedelta(hours=24),
        )
    )
)
```

Фильтрацию по `reminder_time` / `reminder_offsets` оставить в Python (она требует timezone-преобразований, которые сложны в SQL для SQLite).

### 4.3 Исправить `cleanup_expired_notifications()`

**Файл:** `backend/app/services/reminder_service.py` (строка 200-210)

Заменить:
```python
cutoff_date = datetime.now(ZoneInfo('UTC')) - timedelta(days=days)
```
на:
```python
now = datetime.now(ZoneInfo('UTC'))
delete(Notification).where(Notification.expires_at < now)
```

Уведомления удаляются когда `expires_at` прошёл (30 дней после создания), а не `expires_at` + ещё 30 дней.

### 4.4 Оптимизировать `mark_all_as_read()` — bulk update

**Файл:** `backend/app/services/reminder_service.py` (строка 158-175)

Заменить цикл с загрузкой в память на:
```python
from sqlalchemy import update

stmt = (
    update(Notification)
    .where(Notification.user_id == user_id, Notification.is_read == False)
    .values(is_read=True, read_at=datetime.now(UTC))
)
result = await self.db.execute(stmt)
return result.rowcount
```

---

## Этап 5 — Backend: Индексы и валидация

### 5.1 Добавить миграцию с индексами на notifications

**Новый файл:** `backend/alembic/versions/20260414_xxxx_add_notification_indexes.py`

Индексы:
- `ix_notifications_user_read` на `(user_id, is_read)` — для списка непрочитанных
- `ix_notifications_user_created` на `(user_id, created_at)` — для сортировки по дате
- `ix_notifications_expires` на `(expires_at)` — для cleanup

### 5.2 Валидация UUID в API

**Файл:** `backend/app/api/notifications.py`

Заменить:
```python
notification_id: str
```
на:
```python
notification_id: UUID
```

FastAPI автоматически валидирует формат UUID и вернёт 422 при некорректном значении.

### 5.3 Убрать избыточный `selectinload(Notification.task)`

**Файл:** `backend/app/api/notifications.py` (строка 48)

Убрать `selectinload(Notification.task)` из запроса списка. Если `task` нужен только для `task_id` (навигация), то он доступен как FK-столбец без JOIN.

Проверить: если `NotificationResponse` требует данные задачи (название и т.д.) — оставить для `GET /notifications/{id}`, убрать для списка.

---

## Этап 6 — Frontend: NotificationProvider (singleton SSE)

### 6.1 Создать Zustand-стор для уведомлений

**Новый файл:** `frontend/src/stores/notificationStore.ts`

```
interface NotificationState:
    notifications: Notification[]
    total: number
    unreadCount: number
    isLoading: boolean
    error: string | null
    sseState: SSEState

    // Actions
    refetch(params?)
    markAsRead(id)
    markAllAsRead()
    deleteNotification(id)
    startSSE(userId)
    stopSSE()
```

Zustand store вместо хука — чтобы состояние было глобальным (один экземпляр).

### 6.2 Создать SSE-менеджер

**Новый файл:** `frontend/src/services/sseManager.ts`

Singleton-класс для управления SSE-подключением:
- При `connect(userId)` создаёт `EventSource` к `/api/sse/notifications`
- Cookie `access_token` отправляется браузером автоматически (httpOnly)
- При получении события `notification` — вызывает callback (обновление store)
- При `heartbeat` — помечает соединение как живое
- При ошибке — exponential backoff (1с → 30с макс)
- При `disconnect()` — закрывает EventSource

Убрать `useSSE.ts` — заменить на `sseManager`.

### 6.3 Создать NotificationProvider

**Новый файл:** `frontend/src/components/NotificationProvider.tsx`

React-компонент-обёртка (рендерится один раз в `App.tsx` или `main.tsx`):
- Подписывается на `useAuthStore` — при логине запускает SSE, при логауте — останавливает
- Вызывает `refetch()` при получении SSE-события
- Рендерит children без обёртки (нет DOM-элемента)

```tsx
function NotificationProvider({ children }) {
    const { isAuthenticated, user } = useAuthStore()
    const store = useNotificationStore()

    useEffect(() => {
        if (isAuthenticated && user) {
            store.startSSE(user.id)
            store.refetch()
            return () => store.stopSSE()
        }
    }, [isAuthenticated, user])

    return <>{children}</>
}
```

### 6.4 Интегрировать NotificationProvider в App

**Файл:** `frontend/src/main.tsx` (или корневой компонент)

Обернуть приложение в `<NotificationProvider>`.

### 6.5 Обновить NotificationBell

**Файл:** `frontend/src/components/NotificationBell.tsx`

- Убрать `useNotifications()` — читать данные из `useNotificationStore()`
- Убрать polling (строки 36-41) — `setInterval` каждые 30с
- Убрать `notifyNotificationsChanged()` — больше не нужен
- Компонент только отображает данные, не управляет подписками

### 6.6 Обновить Notifications-страницу

**Файл:** `frontend/src/routes/Notifications.tsx`

- Использовать `useNotificationStore()` вместо `useNotifications()`
- Убрать прямые API-вызовы, делегировать store

### 6.7 Удалить устаревшие файлы

- `frontend/src/hooks/useSSE.ts` — заменён на `sseManager.ts`
- `frontend/src/hooks/useNotifications.ts` — заменён на `notificationStore.ts`

---

## Этап 7 — Frontend: Рефакторинг утилит

### 7.1 Вынести `formatTime()` и `typeIcon()` в утилиты

**Новый файл:** `frontend/src/utils/notificationUtils.ts`

Перенести из `NotificationBell.tsx` (строки 62-104) и `Notifications.tsx` (строки 52-94):
- `formatTime(dateStr: string): string`
- `typeIcon(type: string): ReactNode`

Обновить оба компонента: импортировать из `utils/notificationUtils.ts`.

---

## Этап 8 — Тесты

### 8.1 Backend: `tests/test_notifications_api.py` (~15 тестов)

```
test_list_notifications_empty
test_list_notifications_with_data
test_list_notifications_unread_only
test_list_notifications_pagination
test_mark_notification_as_read
test_mark_notification_as_read_not_found
test_mark_notification_as_read_wrong_user
test_mark_all_as_read
test_delete_notification
test_delete_notification_not_found
test_delete_notification_wrong_user
```

### 8.2 Backend: `tests/test_reminder_service.py` (~15 тестов)

```
test_find_due_tasks_with_reminder_time
test_find_due_tasks_with_reminder_offsets
test_find_due_tasks_skips_completed
test_find_due_tasks_skips_no_due_date
test_send_reminder_creates_notification
test_send_reminder_updates_last_sent_at
test_should_send_reminder_first_time
test_should_send_reminder_within_24h
test_should_send_reminder_after_24h
test_mark_all_as_read_bulk
test_cleanup_expired_notifications
test_cleanup_does_not_remove_active
```

### 8.3 Backend: `tests/test_sse.py` (~8 тестов)

```
test_sse_notifications_requires_auth
test_sse_notifications_receives_event
test_sse_rate_limit_max_3_connections
test_sse_heartbeat_sent
test_sse_disconnect_cleans_up
```

---

## Порядок реализации

| Шаг | Этап | Зависимости | Оценка |
|-----|-------|-------------|--------|
| 1 | 1.1-1.2 | Нет | 1 ч |
| 2 | 4.1 | Нет | 0.5 ч |
| 3 | 4.2 | Нет | 0.5 ч |
| 4 | 4.3-4.4 | Нет | 0.5 ч |
| 5 | 2.1-2.3 | Шаг 1 | 1.5 ч |
| 6 | 3.1-3.3 | Шаг 2, 5 | 2 ч |
| 7 | 5.1-5.3 | Нет | 0.5 ч |
| 8 | 6.1-6.7 | Шаг 6 | 2.5 ч |
| 9 | 7.1 | Шаг 8 | 0.5 ч |
| 10 | 8.1-8.3 | Шаг 7 | 2.5 ч |
| | **Итого** | | **~12 ч** |

---

## Зависимости файлов по этапам

### Backend-изменения

| Файл | Этап | Что меняется |
|------|-------|-------------|
| `app/event_bus.py` | 1 | **Новый** — pub/sub на asyncio.Queue |
| `app/security.py` | 2 | Добавить `set_access_cookie()`, `clear_access_cookie()` |
| `app/dependencies.py` | 2 | Добавить `get_current_user_from_cookie()` |
| `app/api/auth.py` | 2 | Вызывать `set_access_cookie` / `clear_access_cookie` |
| `app/api/sse.py` | 3 | Переписать на event-driven + cookie auth |
| `app/services/reminder_service.py` | 4 | Исправить commit/flush, SQL-фильтрация, cleanup, bulk update |
| `app/scheduler.py` | 1,4 | Публиковать события в EventBus, один commit |
| `app/api/notifications.py` | 5 | UUID валидация, убрать selectinload |
| `app/models/notification.py` | 5 | Добавить индексы через миграцию |
| `alembic/versions/...` | 5 | **Новый** — миграция индексов |

### Frontend-изменения

| Файл | Этап | Что меняется |
|------|-------|-------------|
| `src/stores/notificationStore.ts` | 6 | **Новый** — Zustand-стор уведомлений |
| `src/services/sseManager.ts` | 6 | **Новый** — singleton SSE-менеджер |
| `src/components/NotificationProvider.tsx` | 6 | **Новый** — React-провайдер |
| `src/main.tsx` | 6 | Обернуть в NotificationProvider |
| `src/components/NotificationBell.tsx` | 6,7 | Использовать store, убрать polling, вынести утилиты |
| `src/routes/Notifications.tsx` | 6,7 | Использовать store, вынести утилиты |
| `src/utils/notificationUtils.ts` | 7 | **Новый** — formatTime, typeIcon |
| `src/hooks/useSSE.ts` | 6 | **Удалить** |
| `src/hooks/useNotifications.ts` | 6 | **Удалить** |

### Backend-тесты

| Файл | Этап |
|------|-------|
| `tests/test_notifications_api.py` | 8 | **Новый** |
| `tests/test_reminder_service.py` | 8 | **Новый** |
| `tests/test_sse.py` | 8 | **Новый** |

---

## Риски и.mitigation

| Риск | Вероятность | Решение |
|------|------------|---------|
| Cookie не отправляется на SSE (CORS) | Среднее | Настроить `credentials: 'include'` на EventSource; SameSite cookie с правильным доменом |
| Queue переполняется если SSE-клиент медленный | Низкое | `maxlen=10` на Queue — старые события теряются, но при следующем refetch они подтянутся |
| При перезапуске сервера все SSE-соединения разрываются | Низкое | Frontend автоматически переподключается (exponential backoff в sseManager) |
| SQLite блокировки при большом количестве concurrent writes | Среднее | WAL mode уже включён; cleanup/reminder — короткие транзакции |
| Access token cookie (15 мин) — SSE переподключение при истечении | Среднее | SSE переподключится, но получит 401 → frontend делает refresh, получает новый cookie, переподключается |
