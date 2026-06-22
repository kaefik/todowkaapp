# Mattermost Bot Design Specification

**Дата:** 2026-06-22
**Статус:** Draft
**Автор:** AI Agent + User

## Краткое описание

Создание бота для Mattermost с теми же возможностями, что и текущий Telegram-бот Todowka. Реализация через Unified Abstraction подход с абстрактным интерфейсом и адаптерами для каждой платформы.

## Контекст

Текущий Telegram-бот поддерживает:
- Команды: /start, /today, /tomorrow, /date, /inbox, /add, /search, /export, /stats, /menu, /help
- Inline-кнопки для выполнения задач
- Persistent Reply Keyboard
- Ежедневный дайджест, напоминания, дедлайны
- Умный парсер (русский, английский, татарский)
- Авторизация через HMAC (Telegram WebApp)

## Цели

1. Полная Feature Parity с Telegram-ботом (все команды, уведомления, умный парсер)
2. Переиспользование существующего кода (smart parser, command logic)
3. Минимальные изменения в существующем Telegram-боте
4. Поддержка уведомлений (личные сообщения + каналы)
5. Аутентификация через Personal Access Token

## Архитектура

### Unified Bot Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BotInterface (abstract)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ send_message()                                            │   │
│  │ edit_message()                                            │   │
│  │ send_document()                                           │   │
│  │ answer_callback()                                         │   │
│  │ remove_keyboard()                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                      │
│         ┌──────────────────┴──────────────────┐                 │
│         ▼                                      ▼                 │
│ TelegramBotAdapter                MattermostBotAdapter           │
│ (Telegram Bot API)                (Mattermost API + WebSocket)   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                 BaseCommandService (abstract)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ handle_command()                                          │   │
│  │ handle_callback()                                         │   │
│  │ handle_text()                                             │   │
│  │ smart_parser                                              │   │
│  │ calendar_builder                                          │   │
│  │ state_machine                                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                      │
│         ┌──────────────────┴──────────────────┐                 │
│         ▼                                      ▼                 │
│ TelegramCommandService          MattermostCommandService         │
│ (Telegram-specific logic)       (Mattermost-specific logic)      │
└─────────────────────────────────────────────────────────────────┘
```

### Компоненты

1. **BotInterface** - абстрактный интерфейс для всех ботов
2. **TelegramBotAdapter** - обёртка над текущим TelegramNotifierService
3. **MattermostBotAdapter** - новая реализация для Mattermost API
4. **BaseCommandService** - базовый класс с общей логикой
5. **MattermostCommandService** - обработчик команд Mattermost

## Детали реализации

### 1. Abstract Bot Interface

```python
# backend/app/interfaces/bot_interface.py

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

class BotInterface(ABC):
    """Абстрактный интерфейс для всех ботов"""
    
    @abstractmethod
    async def send_message(
        self, 
        user_id: str, 
        text: str, 
        buttons: Optional[List[Dict[str, str]]] = None,
        reply_to: Optional[str] = None
    ) -> str:
        """Отправить сообщение. Возвращает message_id"""
        pass
    
    @abstractmethod
    async def edit_message(
        self, 
        user_id: str, 
        message_id: str, 
        text: str,
        buttons: Optional[List[Dict[str, str]]] = None
    ) -> bool:
        """Редактировать сообщение"""
        pass
    
    @abstractmethod
    async def send_document(
        self, 
        user_id: str, 
        filename: str, 
        content: bytes
    ) -> str:
        """Отправить файл. Возвращает message_id"""
        pass
    
    @abstractmethod
    async def answer_callback(
        self, 
        callback_id: str, 
        text: Optional[str] = None
    ) -> bool:
        """Ответить на callback (нажатие кнопки)"""
        pass
    
    @abstractmethod
    async def remove_keyboard(
        self, 
        user_id: str, 
        message_id: str
    ) -> bool:
        """Убрать клавиатуру из сообщения"""
        pass
```

### 2. Mattermost Adapter

```python
# backend/app/adapters/mattermost_adapter.py

class MattermostBotAdapter(BotInterface):
    """Адаптер для Mattermost API"""
    
    def __init__(self, mattermost_url: str, bot_token: str):
        self.mattermost_url = mattermost_url
        self.bot_token = bot_token
        self.ws_client = None
    
    async def connect_websocket(self):
        """Подключение к Mattermost WebSocket"""
        pass
    
    async def send_message(self, user_id, text, buttons=None, reply_to=None):
        """Отправка через POST /api/v4/posts"""
        pass
    
    async def send_with_actions(self, user_id, text, actions):
        """Отправка с Interactive Message Actions"""
        pass
    
    async def answer_callback(self, callback_id, text=None):
        """Ответ на Interactive Message action"""
        pass
```

**Ключевые особенности Mattermost API:**
- **POST /api/v4/posts** - отправка сообщений
- **WebSocket** - получение событий (post_created, action_received)
- **Interactive Messages** - через attachments.actions
- **Slash Commands** - через POST /api/v4/commands/execute

### 3. Mattermost Command Service

```python
# backend/app/services/mattermost_command_service.py

class MattermostCommandService:
    """Обработчик команд Mattermost бота"""
    
    COMMAND_MAP = {
        '/today': '/today',
        '/tomorrow': '/tomorrow',
        '/inbox': '/inbox',
        '/add': '/add',
        '/search': '/search',
        '/stats': '/stats',
        '/export': '/export',
        '/help': '/help',
    }
    
    async def handle_slash_command(self, command: str, args: str, user_id: str):
        """Обработка slash-команды"""
        pass
    
    async def handle_interactive_message(self, payload: dict):
        """Обработка нажатия кнопки Interactive Message"""
        pass
    
    async def handle_plain_text(self, text: str, user_id: str):
        """Обработка обычного текста (без команд)"""
        pass
```

### 4. Данные в БД

**Расширение модели User:**

```python
# backend/app/models/user.py

class User(Base):
    # ... существующие поля Telegram
    telegram_bot_token: String
    telegram_chat_id: String
    telegram_notifications_enabled: Boolean
    
    # Новые поля для Mattermost
    mattermost_user_id: String
    mattermost_bot_token: String
    mattermost_notifications_enabled: Boolean
    mattermost_channel_id: String
```

**Миграция:**
```python
# alembic/versions/20260622_1200_add_mattermost_fields_to_user_x9g8h7j6k5l4.py

def upgrade():
    op.add_column('users', Column('mattermost_user_id', String(50)))
    op.add_column('users', Column('mattermost_bot_token', String(255)))
    op.add_column('users', Column('mattermost_notifications_enabled', Boolean, default=False))
    op.add_column('users', Column('mattermost_channel_id', String(50)))

def downgrade():
    op.drop_column('users', 'mattermost_channel_id')
    op.drop_column('users', 'mattermost_notifications_enabled')
    op.drop_column('users', 'mattermost_bot_token')
    op.drop_column('users', 'mattermost_user_id')
```

### 5. Уведомления и Автоматизация

**Расширение Scheduler:**

| Тип | Telegram | Mattermost |
|-----|----------|------------|
| Напоминание | `send_reminder()` | `send_mattermost_reminder()` |
| Дедлайн | `send_deadline_notification()` | `send_mattermost_deadline()` |
| Дайджест | `send_daily_digest()` | `send_mattermost_digest()` |
| Бэкап | `send_document()` | `send_document()` (общий) |

### 6. Структура файлов

```
backend/app/
├── interfaces/
│   └── bot_interface.py
├── adapters/
│   ├── telegram_adapter.py
│   └── mattermost_adapter.py
├── services/
│   ├── base_command_service.py
│   ├── telegram_command_service.py
│   └── mattermost_command_service.py
├── models/
│   └── user.py
├── api/
│   ├── mattermost_auth.py
│   └── mattermost_webhook.py
└── scheduler.py
```

### 7. Фронтенд

**MattermostSettings компонент:**
```tsx
function MattermostSettings() {
  return (
    <div className="mattermost-settings">
      <h3>Mattermost</h3>
      <Input label="Bot Token" />
      <Button onClick={validateToken}>Проверить токен</Button>
      <Button onClick={bindAccount}>Привязать аккаунт</Button>
      <Toggle label="Уведомления" />
      <Select label="Канал для уведомлений" />
      <Button onClick={disconnect} variant="danger">Отключить</Button>
    </div>
  );
}
```

### 8. Конфигурация

```bash
# .env.example

MATTERMOST_URL=https://mattermost.example.com
MATTERMOST_BOT_TOKEN=your-bot-token-here
MATTERMOST_BOT_USER_ID=bot-user-id
```

### 9. Зависимости

```toml
# backend/pyproject.toml

[project]
dependencies = [
    # ... существующие
    "mattermostdriver>=7.0.0",
    "websockets>=12.0",
]
```

### 10. Тестирование

```python
# backend/tests/test_mattermost_command_service.py
# backend/tests/test_mattermost_adapter.py
# backend/tests/test_mattermost_auth_api.py
```

### 11. План реализации

**Разбивка на подпроекты:**

| Подпроект | Описание | Зависимости |
|-----------|----------|-------------|
| P1: Core Abstraction | Abstract Bot Interface + BaseCommandService | Нет |
| P2: Mattermost Adapter | WebSocket + API клиент | P1 |
| P3: Command Service | Slash-команды + Interactive Messages | P1, P2 |
| P4: Database & Auth | Миграция + API аутентификации | P1 |
| P5: Notifications | Напоминания, дайджест, дедлайны | P2, P3 |
| P6: Frontend | Настройки Mattermost | P4 |
| P7: Testing | Unit + Integration + E2E | P1-P6 |

**Детальный план по подпроектам:**

| Этап | Подпроект | Описание | Время |
|------|-----------|----------|-------|
| 1 | P1 | Abstract Bot Interface + BaseCommandService | 2-3 дня |
| 2 | P2 | MattermostBotAdapter (WebSocket + API) | 3-4 дня |
| 3 | P3 | MattermostCommandService (slash-команды) | 4-5 дней |
| 4 | P4 | БД миграция + API аутентификации | 2-3 дня |
| 5 | P5 | Уведомления (напоминания, дайджест) | 2-3 дня |
| 6 | P6 | Фронтенд (настройки) | 2-3 дня |
| 7 | P7 | Тестирование | 3-4 дня |
| **Итого** | | | **20-28 дней** |

## Риски

| Риск | Вероятность | Влияние | Mitigation |
|------|-------------|---------|------------|
| WebSocket стабильность | Средняя | Высокое | Fallback на HTTP polling |
| Interactive Messages limitations | Низкая | Среднее | Тестирование на staging |
| Отладка WebSocket | Средняя | Среднее | Логирование всех событий |

## Открытые вопросы

1. Какой тип Mattermost сервера будет использоваться (Team/Enterprise)?
2. Нужна ли поддержка нескольких Mattermost серверов?
3. Как обрабатывать ошибки WebSocket переподключения?

## Дополнительные детали

### Регистрация Slash-команд

Slash-команды регистрируются через API Mattermost:

```python
# Регистрация команд при старте бота
POST /api/v4/commands
{
    "token": bot_token,
    "trigger": "today",
    "description": "Показать задачи на сегодня",
    "autocomplete": True,
    "autocomplete_data": []
}
```

Альтернатива: использования System Console → Integrations → Slash Commands (ручная настройка).

### State Machine и WebSocket

State machine для /add flow работает следующим образом:

1. Пользователь вызывает `/add`
2. Бот отправляет сообщение с календарем (Interactive Message)
3. Пользователь нажимает кнопку даты
4. Mattermost отправляет action через WebSocket
5. Бот обрабатывает action и переходит к следующему шагу
6. Повторяется直到 завершения создания задачи

Таймаут: 5 минут (как в Telegram). Если пользователь не отвечает, flow сбрасывается.

### Fallback на HTTP Polling

Если WebSocket недоступен или падает, бот переключается на HTTP polling:

```python
# Fallback polling
async def poll_updates():
    while True:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{mattermost_url}/api/v4/posts",
                headers={"Authorization": f"Bearer {bot_token}"}
            )
            # Обработка сообщений
        await asyncio.sleep(5)  # каждые 5 секунд
```

## Следующие шаги

1. Записать design doc
2. Self-review
3. User review
4. Перейти к writing-plans для создания implementation plan
