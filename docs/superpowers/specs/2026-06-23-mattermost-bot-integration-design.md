# Дизайн-спецификация: Интеграция Mattermost через бота

**Дата:** 2026-06-23
**Статус:** Утвержден
**Автор:** AI Assistant

---

## Контекст

Текущая интеграция с Mattermost работает через Personal Access Token (PAT) — каждый пользователь создаёт свой токен в Mattermost и вводит его в настройках Todowka. Это неудобно: пользователи должны знать, как создать PAT, и хранить персональные токены в базе данных.

**Цель:** Переключиться на интеграцию через бота Mattermost как основной режим, оставив PAT как запасной вариант.

**Требования:**
1. Бот-токен настраивается через UI (админ) или `.env`
2. Пользователи привязывают себя через email в Mattermost
3. Привязка требует ручного подтверждения
4. PAT остаётся как запасной вариант
5. Уведомления отправляются через бота (не от имени пользователя)

---

## Архитектура

### Общая схема

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript)                               │
│  MattermostSettings.tsx                                      │
│  ├── Режим "Бот": email → поиск → подтверждение              │
│  └── Режим "PAT": токен → валидация → сохранение             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST
┌──────────────────────────▼──────────────────────────────────┐
│  Backend API: mattermost_auth.py                             │
│  POST /mattermost/bot/bind        — поиск по email           │
│  POST /mattermost/bot/confirm     — подтверждение привязки   │
│  POST /mattermost/bot/unbind      — отвязка                  │
│  POST /mattermost/bot/status      — статус привязки          │
│  POST /mattermost/validate-token  — PAT (остаётся)           │
│  POST /mattermost/save-token      — PAT (остаётся)           │
│  POST /mattermost/logout          — очистка (остаётся)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Service Layer                                               │
│  MattermostNotifierService — отправка уведомлений            │
│  MattermostCommandService  — обработка команд                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Adapter: MattermostBotAdapter                               │
│  ├── send_message()           — отправка сообщения           │
│  ├── get_user_by_email()     — поиск пользователя по email   │
│  ├── create_direct_channel()  — создание DM-канала           │
│  └── get_current_user_id()   — ID бота                       │
└─────────────────────────────────────────────────────────────┘
```

### Режимы работы

| Режим | Токен | Привязка | Использование |
|-------|-------|----------|---------------|
| **Bot** (основной) | Глобальный `MATTERMOST_BOT_TOKEN` | Email + подтверждение | Уведомления от бота |
| **PAT** (запасной) | Персональный токен пользователя | Ввод токена | Уведомления от имени пользователя |

---

## Модель данных

### Изменения в модели User

```python
class User(Base):
    # Существующие поля (без изменений)
    mattermost_user_id: String(50), nullable
    mattermost_bot_token: String(255), nullable  # зашифрованный PAT
    mattermost_notifications_enabled: Boolean, default=False
    mattermost_channel_id: String(50), nullable
    mattermost_url: String(255), nullable

    # Новые поля
    mattermost_email: String(255), nullable        # email для привязки через бота
    mattermost_bind_mode: String(20), default='pat'  # 'bot' или 'pat'
```

### Миграция

```python
# Новая миграция
def upgrade():
    op.add_column('users', sa.Column('mattermost_email', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('mattermost_bind_mode', sa.String(20), server_default='pat'))

def downgrade():
    op.drop_column('users', 'mattermost_bind_mode')
    op.drop_column('users', 'mattermost_email')
```

---

## API Эндпоинты

### 1. Привязка через бота (поиск по email)

```
POST /api/mattermost/bot/bind
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "found": true,
  "mattermost_user_id": "abc123",
  "username": "john_doe",
  "display_name": "John Doe"
}
```

**Response (404):**
```json
{
  "found": false,
  "error": "User not found in Mattermost"
}
```

**Логика:**
1. Получает `MATTERMOST_BOT_TOKEN` из настроек
2. Делает `GET {MATTERMOST_URL}/api/v4/users/email/{email}` с заголовком `Authorization: Bearer {bot_token}`
3. Если пользователь найден — возвращает данные
4. Если не найден — 404

### 2. Подтверждение привязки

```
POST /api/mattermost/bot/confirm
```

**Request:**
```json
{
  "mattermost_user_id": "abc123",
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Mattermost account bound successfully"
}
```

**Логика:**
1. Сохраняет `mattermost_user_id` и `mattermost_email` в профиле пользователя
2. Устанавливает `mattermost_bind_mode = 'bot'`
3. Включает `mattermost_notifications_enabled = True`

### 3. Статус привязки

```
POST /api/mattermost/bot/status
```

**Response (200):**
```json
{
  "bound": true,
  "bind_mode": "bot",
  "email": "user@example.com",
  "mattermost_user_id": "abc123",
  "username": "john_doe",
  "notifications_enabled": true
}
```

### 4. Отвязка

```
POST /api/mattermost/bot/unbind
```

**Response (200):**
```json
{
  "success": true,
  "message": "Mattermost account unbound"
}
```

**Логика:**
1. Обнуляет `mattermost_user_id`, `mattermost_email`, `mattermost_bind_mode`
2. Устанавливает `mattermost_bind_mode = 'pat'` (возврат к PAT)

---

## Адаптер: MattermostBotAdapter

### Новые методы

```python
class MattermostBotAdapter(BotInterface):
    async def get_user_by_email(self, email: str) -> dict | None:
        """Поиск пользователя по email через API бота"""
        # GET /api/v4/users/email/{email}
        # Возвращает { id, username, email, first_name, last_name } или None

    async def get_bot_user_id(self) -> str:
        """Получение ID бота"""
        # GET /api/v4/users/me
        # Кэшируется на время жизни адаптера
```

### Изменения в существующих методах

```python
async def send_message(self, channel_id: str, text: str) -> dict:
    """Отправка сообщения (без изменений)"""
    # POST /api/v4/posts
    # { channel_id, message }

    # Дополнительно: если это DM-канал, убедиться что бот в канале
    # Mattermost автоматически добавляет бота в DM при create_direct_channel
```

---

## Сервис уведомлений: MattermostNotifierService

### Изменения в send_reminder

```python
async def send_reminder(self, user, task):
    """Отправка напоминания с учётом режима привязки"""
    if not user.mattermost_notifications_enabled:
        return

    if user.mattermost_bind_mode == 'bot':
        # Режим бота: используем глобальный токен
        adapter = MattermostBotAdapter(
            mattermost_url=settings.mattermost_url,
            bot_token=settings.mattermost_bot_token
        )
        # Создаём/находим DM-канал с пользователем
        dm_channel = adapter.get_or_create_dm_channel(user.mattermost_user_id)
        # Отправляем сообщение
        await adapter.send_message(dm_channel, self._format_reminder(task))
    else:
        # Режим PAT: используем персональный токен
        if not user.mattermost_bot_token:
            return
        adapter = MattermostBotAdapter(
            mattermost_url=user.mattermost_url or settings.mattermost_url,
            bot_token=user.decrypted_mattermost_bot_token
        )
        dm_channel = adapter.get_or_create_dm_channel(user.mattermost_user_id)
        await adapter.send_message(dm_channel, self._format_reminder(task))
```

---

## Фронтенд: MattermostSettings.tsx

### Интерфейс

```
┌─────────────────────────────────────────────────────────┐
│  Настройки Mattermost                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Режим подключения: [Бот] [PAT]                          │
│                                                          │
│  ── Если выбран "Бот" ──                                 │
│                                                          │
│  Email в Mattermost: [_______________]                   │
│  [Найти пользователя]                                   │
│                                                          │
│  Найден: john_doe (John Doe)                             │
│  [Привязать аккаунт]                                     │
│                                                          │
│  Статус: Привязан к john_doe                             │
│  [Отвязать]                                              │
│                                                          │
│  ── Если выбран "PAT" ──                                 │
│                                                          │
│  Personal Access Token: [_______________]                │
│  [Проверить токен]                                       │
│                                                          │
│  URL Mattermost (опционально): [_______________]         │
│                                                          │
│  Уведомления: [Включены]                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### API клиент (mattermost.ts)

```typescript
// Новые методы
export const mattermostApi = {
  // Бот-режим
  botBind: (email: string) => 
    httpClient.post('/mattermost/bot/bind', { email }),
  
  botConfirm: (mattermostUserId: string, email: string) => 
    httpClient.post('/mattermost/bot/confirm', { mattermost_user_id: mattermostUserId, email }),
  
  botStatus: () => 
    httpClient.post('/mattermost/bot/status'),
  
  botUnbind: () => 
    httpClient.post('/mattermost/bot/unbind'),

  // PAT-режим (остаётся)
  validateToken: (token: string, mattermostUrl?: string) => 
    httpClient.post('/mattermost/validate-token', { token, mattermost_url: mattermostUrl }),
  
  saveToken: (token: string) => 
    httpClient.post('/mattermost/save-token', { token }),
  
  logout: () => 
    httpClient.post('/mattermost/logout'),
};
```

---

## Переменные окружения

| Переменная | Описание | Обязательна для бота |
|------------|----------|---------------------|
| `MATTERMOST_URL` | URL сервера Mattermost | Да |
| `MATTERMOST_BOT_TOKEN` | Токен бота | Да |
| `MATTERMOST_BOT_USER_ID` | ID бота (автоопределяется) | Нет |
| `SECRETS_ENCRYPTION_KEY` | Ключ шифрования (для PAT) | Только для PAT |

---

## Тесты

### Backend тесты

```python
# test_mattermost_bot_bind.py
- test_bot_bind_user_found: поиск существующего пользователя
- test_bot_bind_user_not_found: поиск несуществующего пользователя
- test_bot_confirm_binding: подтверждение привязки
- test_bot_unbind: отвязка
- test_bot_status: получение статуса

# test_mattermost_notifier_bot_mode.py
- test_send_reminder_bot_mode: отправка через бота
- test_send_reminder_pat_mode: отправка через PAT (без изменений)
```

### Frontend тесты

```typescript
// MattermostSettings.test.tsx
- test_renders_bot_mode_by_default
- test_switches_between_bot_and_pat_modes
- test_bot_bind_flow: полный флоу привязки через бота
- test_bot_unbind_flow: флоу отвязки
```

---

## Миграция данных

### Существующие пользователи с PAT

Пользователи с `mattermost_bot_token` автоматически получают `mattermost_bind_mode = 'pat'`. Их настройки не изменяются.

### Новые пользователи

По умолчанию `mattermost_bind_mode = 'pat'`. Пользователь может переключиться на бота в настройках.

---

## Порядок реализации

1. **Миграция БД** — добавить новые поля в User
2. **Адаптер** — добавить `get_user_by_email()` в MattermostBotAdapter
3. **API** — добавить эндпоинты bot/bind, bot/confirm, bot/unbind, bot/status
4. **Сервис** — адаптировать MattermostNotifierService под два режима
5. **Фронтенд** — обновить MattermostSettings.tsx для двух режимов
6. **Тесты** — написать тесты для нового функционала
7. **Документация** — обновить docs/features.md

---

## Открытые вопросы

1. **Кэширование bot_user_id** — нужно ли кэшировать ID бота или получать каждый раз?
2. **Rate limiting** — Mattermost API имеет лимиты, нужно ли добавить retry logic?
3. **Обработка ошибок** — что делать, если бот не может отправить сообщение (пользователь заблокировал бота)?

---

## Зависимости

- `mattermostdriver>=7.0.0` (уже есть в `pyproject.toml`)
- Нет новых зависимостей
