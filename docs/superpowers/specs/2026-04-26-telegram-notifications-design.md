# Telegram-оповещения для напоминаний о задачах

**Дата:** 2026-04-26
**Статус:** Approved

## Цель

Добавить отправку напоминаний о задачах в Telegram. Напоминания дублируются — остаются в браузере (SSE + Browser Notifications) и дополнительно отправляются в Telegram-чат пользователя.

## Решения

- **События:** только `due_reminder` (напоминания о задачах)
- **Бот:** каждый пользователь создаёт своего бота через @BotFather и вставляет токен в настройках
- **Архитектура:** polling через httpx (без python-telegram-bot), без webhook
- **Привязка:** пользователь пишет `/start` боту → scheduler job захватывает chat_id

## Архитектура

### Поток данных

```
Настройка (одноразово):
  Пользователь → @BotFather → получает токен
  Пользователь → Настройки → вставляет токен → сохраняется в User.telegram_bot_token
  Scheduler job (_job_poll_telegram_bots, каждые 5 сек) → getUpdates → /start → сохраняет chat_id

Напоминание (регулярно):
  _job_send_due_reminders → ReminderService.send_reminder()
  → создаёт Notification (как сейчас)
  → отправляет SSE (как сейчас)
  → NEW: TelegramNotifierService.send_reminder() → httpx POST sendMessage
```

### Компоненты

#### Backend

**1. Новые поля в модели User (`backend/app/models/user.py`):**
- `telegram_bot_token: str | None` — токен бота пользователя (String 255)
- `telegram_chat_id: str | None` — ID чата (String 50)
- `telegram_notifications_enabled: bool` — вкл/выкл (default: False)

**2. Миграция БД:** добавить три колонки в таблицу `users`.

**3. Обновление схем (`backend/app/schemas/user.py`):**
- `UserResponse`: добавить `telegram_bot_token` (маскированный, показывать последние 5 символов), `telegram_chat_id`, `telegram_notifications_enabled`
- `UserUpdate`: добавить `telegram_bot_token`, `telegram_notifications_enabled`

**4. Новый сервис `backend/app/services/telegram_notifier.py`:**

```python
class TelegramNotifierService:
    BASE_URL = "https://api.telegram.org/bot{token}/{method}"

    async def send_message(bot_token: str, chat_id: str, text: str) -> bool
        # httpx POST sendMessage, timeout 10s, обработка ошибок

    async def validate_token(bot_token: str) -> dict | None
        # httpx GET getMe, возвращает info о боте или None

    async def poll_updates(bot_token: str, offset: int | None = None) -> list[dict]
        # httpx GET getUpdates, возвращает список updates

    async def send_reminder(user: User, task: Task) -> bool
        # формирует текст напоминания и отправляет через send_message
```

Формат сообщения:
```
🔔 Напоминание о задаче

📋 {task.title}
📅 Дедлайн: {due_date.strftime('%d.%m.%Y %H:%M')}
```

**5. Новый scheduler job (`backend/app/scheduler.py`):**

`_job_poll_telegram_bots` (интервал: 5 секунд):
- Запрашивает всех пользователей с `telegram_bot_token IS NOT NULL AND telegram_chat_id IS NULL`
- Для каждого вызывает `TelegramNotifierService.poll_updates(token)`
- При получении сообщения `/start` → сохраняет `chat_id` в User
- Хранит `update_id` offset в памяти, при рестарте сервера offset сбрасывается (безопасно)
- При успешной привязке отправляет приветственное сообщение

**6. Интеграция в `_job_send_due_reminders`:**

После создания Notification и публикации SSE — если у пользователя `telegram_notifications_enabled=True` и `telegram_chat_id` задан → вызвать `TelegramNotifierService.send_reminder(user, task)`.

Обработка ошибок:
- Ошибка отправки → `logger.error(...)`, не блокирует основное напоминание
- `403 Forbidden` (пользователь заблокировал бота) → автоматически установить `telegram_notifications_enabled=False`

**7. API эндпоинт для валидации токена:**

`POST /api/users/telegram/validate-token` — принимает `telegram_bot_token`, вызывает `getMe`, возвращает имя бота или ошибку.

#### Frontend

**8. Секция «Telegram» в Настройках (`frontend/src/routes/Settings.tsx`, вкладка «Общие»):**

UI-элементы:
- Поле ввода токена бота (type=password, с возможностью показать/скрыть)
- Кнопка «Проверить» → POST /api/users/telegram/validate-token → показывает имя бота
- Кнопка «Сохранить» → PATCH /api/users/me с telegram_bot_token
- Статус подключения: «Не подключён» / «Ожидает /start» (токен есть, chat_id нет) / «Подключён» (chat_id есть)
- Переключатель вкл/выкл (виден только при подключённом боте)
- Подсказка: инструкции как создать бота через @BotFather

**9. i18n:** добавить ключи в ru/ и en/ неймспейсы `settings`.

### Обработка ошибок

| Ситуация | Действие |
|----------|----------|
| Невалидный токен | Предупреждение при проверке/сохранении |
| Пользователь заблокировал бота (403) | Авто-отключение `telegram_notifications_enabled` |
| Сеть недоступна | Логирование, retry при следующем напоминании |
| Токен отозван | Логирование + SSE-уведомление пользователю |

### Новые файлы

- `backend/app/services/telegram_notifier.py`
- `backend/alembic/versions/YYYYMMDD_HHMM_add_telegram_fields_to_user_xxx.py`

### Изменяемые файлы

- `backend/app/models/user.py` — 3 новых поля
- `backend/app/schemas/user.py` — новые поля в UserResponse/UserUpdate
- `backend/app/scheduler.py` — новый job + интеграция в _job_send_due_reminders
- `backend/app/services/reminder_service.py` — вызов TelegramNotifier
- `backend/app/api/users.py` — эндпоинт validate-token
- `frontend/src/routes/Settings.tsx` — секция Telegram
- `frontend/src/api/users.ts` — валидация токена
- `frontend/src/i18n/locales/ru/settings.json` — ключи
- `frontend/src/i18n/locales/en/settings.json` — ключи
- `docs/features.md` — документация

### Зависимости

Новых зависимостей нет — `httpx` уже в `pyproject.toml`.
