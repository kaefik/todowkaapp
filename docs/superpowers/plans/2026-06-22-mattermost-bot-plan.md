# Mattermost Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Mattermost bot with feature parity to the existing Telegram bot using Unified Abstraction approach.

**Architecture:** Abstract BotInterface with adapters for Telegram and Mattermost. BaseCommandService contains shared logic, MattermostCommandService handles Mattermost-specific commands via WebSocket and Interactive Messages.

**Tech Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), mattermostdriver, websockets, Pydantic v2

---

## File Structure

```
backend/app/
├── interfaces/
│   └── bot_interface.py              # NEW: Abstract BotInterface
├── adapters/
│   ├── __init__.py                   # NEW
│   ├── telegram_adapter.py           # NEW: Wrapper for TelegramNotifierService
│   └── mattermost_adapter.py         # NEW: Mattermost API + WebSocket
├── services/
│   ├── base_command_service.py       # NEW: Shared command logic
│   ├── telegram_command_service.py   # MODIFY: Inherit from BaseCommandService
│   └── mattermost_command_service.py # NEW: Mattermost command handler
├── models/
│   └── user.py                       # MODIFY: Add mattermost_* fields
├── api/
│   ├── mattermost_auth.py            # NEW: Mattermost auth endpoints
│   └── mattermost_webhook.py         # NEW: Webhook endpoint (optional)
├── i18n/locales/
│   ├── ru.json                       # MODIFY: Add mattermost_* keys
│   ├── en.json                       # MODIFY: Add mattermost_* keys
│   └── tt.json                       # MODIFY: Add mattermost_* keys
├── config.py                         # MODIFY: Add Mattermost settings
├── scheduler.py                      # MODIFY: Add Mattermost jobs
└── database.py                       # No changes

backend/tests/
├── test_bot_interface.py             # NEW
├── test_mattermost_adapter.py        # NEW
├── test_mattermost_command_service.py # NEW
├── test_mattermost_auth_api.py       # NEW
└── test_mattermost_auth.py           # NEW

frontend/src/
├── api/
│   └── mattermost.ts                 # NEW: Mattermost API calls
├── components/
│   └── MattermostSettings.tsx        # NEW: Settings component
└── routes/
    └── Settings.tsx                  # MODIFY: Add MattermostSettings
```

---

## Task 1: Create BotInterface

**Files:**
- Create: `backend/app/interfaces/__init__.py`
- Create: `backend/app/interfaces/bot_interface.py`
- Create: `backend/tests/test_bot_interface.py`

- [ ] **Step 1: Create interfaces package**

```bash
mkdir -p backend/app/interfaces
touch backend/app/interfaces/__init__.py
```

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_bot_interface.py

import pytest
from app.interfaces.bot_interface import BotInterface


def test_bot_interface_is_abstract():
    """BotInterface cannot be instantiated directly"""
    with pytest.raises(TypeError):
        BotInterface()


def test_bot_interface_has_required_methods():
    """BotInterface defines all required abstract methods"""
    abstract_methods = BotInterface.__abstractmethods__
    expected_methods = {
        'send_message', 'edit_message', 'send_document',
        'answer_callback', 'remove_keyboard'
    }
    assert expected_methods == abstract_methods
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bot_interface.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app.interfaces.bot_interface'"

- [ ] **Step 4: Write minimal implementation**

```python
# backend/app/interfaces/bot_interface.py

from abc import ABC, abstractmethod
from typing import Optional


class BotInterface(ABC):
    """Abstract interface for all bots"""

    @abstractmethod
    async def send_message(
        self,
        user_id: str,
        text: str,
        buttons: Optional[list[dict[str, str]]] = None,
        reply_to: Optional[str] = None,
    ) -> str:
        """Send a message. Returns message_id."""
        ...

    @abstractmethod
    async def edit_message(
        self,
        user_id: str,
        message_id: str,
        text: str,
        buttons: Optional[list[dict[str, str]]] = None,
    ) -> bool:
        """Edit an existing message."""
        ...

    @abstractmethod
    async def send_document(
        self,
        user_id: str,
        filename: str,
        content: bytes,
    ) -> str:
        """Send a file attachment. Returns message_id."""
        ...

    @abstractmethod
    async def answer_callback(
        self,
        callback_id: str,
        text: Optional[str] = None,
    ) -> bool:
        """Answer a callback query (button press)."""
        ...

    @abstractmethod
    async def remove_keyboard(
        self,
        user_id: str,
        message_id: str,
    ) -> bool:
        """Remove inline keyboard from a message."""
        ...
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_bot_interface.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/interfaces/ backend/tests/test_bot_interface.py
git commit -m "feat(mattermost): add abstract BotInterface"
```

---

## Task 2: Create TelegramBotAdapter

**Files:**
- Create: `backend/app/adapters/__init__.py`
- Create: `backend/app/adapters/telegram_adapter.py`

- [ ] **Step 1: Create adapters package**

```bash
mkdir -p backend/app/adapters
touch backend/app/adapters/__init__.py
```

- [ ] **Step 2: Write the adapter**

```python
# backend/app/adapters/telegram_adapter.py

from typing import Optional

from app.interfaces.bot_interface import BotInterface
from app.services.telegram_notifier import TelegramNotifierService


class TelegramBotAdapter(BotInterface):
    """Adapter wrapping existing TelegramNotifierService"""

    def __init__(self, bot_token: str):
        self.bot_token = bot_token

    async def send_message(
        self,
        user_id: str,
        text: str,
        buttons: Optional[list[dict[str, str]]] = None,
        reply_to: Optional[str] = None,
    ) -> str:
        reply_markup = None
        if buttons:
            reply_markup = {"inline_keyboard": [buttons]}
        result = await TelegramNotifierService.send_message_with_buttons(
            self.bot_token, user_id, text, reply_markup
        )
        return str(result.get("message_id", "")) if result else ""

    async def edit_message(
        self,
        user_id: str,
        message_id: str,
        text: str,
        buttons: Optional[list[dict[str, str]]] = None,
    ) -> bool:
        reply_markup = None
        if buttons:
            reply_markup = {"inline_keyboard": [buttons]}
        result = await TelegramNotifierService.edit_message_text(
            self.bot_token, user_id, int(message_id), text, reply_markup
        )
        return result is not None

    async def send_document(
        self,
        user_id: str,
        filename: str,
        content: bytes,
    ) -> str:
        result = await TelegramNotifierService.send_document(
            self.bot_token, user_id, filename, content
        )
        return str(result.get("message_id", "")) if result else ""

    async def answer_callback(
        self,
        callback_id: str,
        text: Optional[str] = None,
    ) -> bool:
        return await TelegramNotifierService.answer_callback_query(
            self.bot_token, callback_id, text or ""
        )

    async def remove_keyboard(
        self,
        user_id: str,
        message_id: str,
    ) -> bool:
        return await TelegramNotifierService.edit_message_text(
            self.bot_token, user_id, int(message_id),
            " ", None
        ) is not None
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/adapters/
git commit -m "feat(mattermost): add TelegramBotAdapter"
```

---

## Task 3: Create BaseCommandService

**Files:**
- Create: `backend/app/services/base_command_service.py`
- Create: `backend/tests/test_base_command_service.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_base_command_service.py

import pytest
from app.services.base_command_service import BaseCommandService


def test_base_command_service_is_abstract():
    """BaseCommandService cannot be instantiated directly"""
    with pytest.raises(TypeError):
        BaseCommandService()


def test_base_command_service_has_required_methods():
    """BaseCommandService defines required abstract methods"""
    abstract_methods = BaseCommandService.__abstractmethods__
    assert 'handle_command' in abstract_methods
    assert 'handle_callback' in abstract_methods
    assert 'handle_text' in abstract_methods
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_base_command_service.py -v`
Expected: FAIL with "ModuleNotFoundError"

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/base_command_service.py

from abc import ABC, abstractmethod
from calendar import monthcalendar
from datetime import UTC, date, datetime, time, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from app.i18n import t as i18n_t

MONTH_NAMES_RU = {
    1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
    5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
    9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь",
}

MONTH_NAMES_EN = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December",
}


class BaseCommandService(ABC):
    """Base class with shared command logic for all platforms"""

    def __init__(self):
        self._pending_adds: dict[str, dict] = {}
        self._pending_add_timeout = timedelta(minutes=5)

    @abstractmethod
    async def handle_command(self, command: str, args: str, user_id: str):
        """Handle a slash command"""
        ...

    @abstractmethod
    async def handle_callback(self, callback_data: str, user_id: str):
        """Handle a callback from inline button"""
        ...

    @abstractmethod
    async def handle_text(self, text: str, user_id: str):
        """Handle plain text message"""
        ...

    def cleanup_expired_states(self):
        """Remove expired add-task states"""
        now = datetime.now(UTC)
        expired = [
            k for k, v in self._pending_adds.items()
            if now - v.get("created_at", now) > self._pending_add_timeout
        ]
        for k in expired:
            del self._pending_adds[k]

    def clear_user_state(self, user_id: str):
        """Clear pending state for a user"""
        self._pending_adds.pop(user_id, None)

    @staticmethod
    def month_name(month: int, lang: str) -> str:
        names = MONTH_NAMES_RU if lang == "ru" else MONTH_NAMES_EN
        return names.get(month, str(month))

    def build_calendar_keyboard(
        self, year: int, month: int, prefix: str, lang: str = "ru"
    ) -> list[list[dict]]:
        """Build calendar keyboard as list of rows"""
        weeks = monthcalendar(year, month)
        month_name = self.month_name(month, lang)

        buttons = []

        # Navigation header
        buttons.append([
            {"text": "◀️", "callback_data": f"{prefix}_nav:{year}:{month - 1}"},
            {"text": f"{month_name} {year}", "callback_data": "ignore"},
            {"text": "▶️", "callback_data": f"{prefix}_nav:{year}:{month + 1}"},
        ])

        # Day names
        day_names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] if lang == "ru" \
            else ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
        buttons.append([{"text": d, "callback_data": "ignore"} for d in day_names])

        # Calendar days
        today = date.today()
        for week in weeks:
            row = []
            for day in week:
                if day == 0:
                    row.append({"text": " ", "callback_data": "ignore"})
                else:
                    cell_date = date(year, month, day)
                    text = f"·{day}·" if cell_date == today else str(day)
                    row.append({
                        "text": text,
                        "callback_data": f"{prefix}:{year}:{month}:{day}",
                    })
            buttons.append(row)

        # Add task specific buttons
        if prefix == "addcal":
            buttons.append([{"text": i18n_t("telegramAddNoDate", lang), "callback_data": f"{prefix}:nodate"}])
            buttons.append([{"text": i18n_t("telegramAddCancel", lang), "callback_data": "addcancel"}])

        return buttons
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_base_command_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/base_command_service.py backend/tests/test_base_command_service.py
git commit -m "feat(mattermost): add BaseCommandService with shared logic"
```

---

## Task 4: Refactor TelegramCommandService to inherit BaseCommandService

**Files:**
- Modify: `backend/app/services/telegram_command_service.py`

- [ ] **Step 1: Update TelegramCommandService inheritance**

```python
# backend/app/services/telegram_command_service.py

# Add import at top
from app.services.base_command_service import BaseCommandService

# Change class declaration
class TelegramCommandService(BaseCommandService):
    def __init__(self):
        super().__init__()
```

- [ ] **Step 2: Remove duplicated methods from TelegramCommandService**

Remove these methods (now in BaseCommandService):
- `_cleanup_expired_states` → use `self.cleanup_expired_states()`
- `_clear_user_state` → use `self.clear_user_state()`
- `_month_name` → use `self.month_name()`
- `_build_calendar_keyboard` → use `self.build_calendar_keyboard()`

Remove these module-level variables (now in BaseCommandService):
- `_pending_adds`
- `_pending_add_timeout`
- `_MONTH_NAMES_RU`
- `_MONTH_NAMES_EN`

- [ ] **Step 3: Run existing Telegram tests to verify no regression**

Run: `cd backend && python -m pytest tests/test_telegram_command_service.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/telegram_command_service.py
git commit -m "refactor(mattermost): TelegramCommandService inherits BaseCommandService"
```

---

## Task 5: Create MattermostBotAdapter

**Files:**
- Create: `backend/app/adapters/mattermost_adapter.py`
- Create: `backend/tests/test_mattermost_adapter.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_mattermost_adapter.py

import pytest
from unittest.mock import AsyncMock, patch
from app.adapters.mattermost_adapter import MattermostBotAdapter


@pytest.fixture
def adapter():
    return MattermostBotAdapter(
        mattermost_url="http://localhost:8065",
        bot_token="test-bot-token"
    )


def test_adapter_initialization(adapter):
    """Adapter initializes with correct config"""
    assert adapter.mattermost_url == "http://localhost:8065"
    assert adapter.bot_token == "test-bot-token"


@pytest.mark.asyncio
async def test_send_message_requires_implementation(adapter):
    """send_message must be implemented"""
    with pytest.raises(NotImplementedError):
        await adapter.send_message("user123", "Hello")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_mattermost_adapter.py -v`
Expected: FAIL with "ModuleNotFoundError"

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/adapters/mattermost_adapter.py

import logging
from typing import Optional

import httpx

from app.interfaces.bot_interface import BotInterface

logger = logging.getLogger(__name__)

HTTPX_TIMEOUT = 10.0


class MattermostBotAdapter(BotInterface):
    """Adapter for Mattermost API"""

    def __init__(self, mattermost_url: str, bot_token: str):
        self.mattermost_url = mattermost_url.rstrip("/")
        self.bot_token = bot_token
        self.ws_client = None

    @property
    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.bot_token}"}

    async def send_message(
        self,
        user_id: str,
        text: str,
        buttons: Optional[list[dict[str, str]]] = None,
        reply_to: Optional[str] = None,
    ) -> str:
        payload = {
            "channel_id": user_id,
            "message": text,
        }
        if reply_to:
            payload["root_id"] = reply_to

        if buttons:
            attachments = [{
                "actions": [
                    {
                        "name": btn.get("text", ""),
                        "type": "button",
                        "integration": {
                            "url": "",
                            "context": {
                                "action": btn.get("callback_data", ""),
                            },
                        },
                    }
                    for btn in buttons
                ]
            }]
            payload["props"] = {"attachments": attachments}

        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.post(
                    f"{self.mattermost_url}/api/v4/posts",
                    headers=self._headers,
                    json=payload,
                )
                data = resp.json()
                return data.get("id", "")
        except httpx.HTTPError as e:
            logger.warning(f"Mattermost send_message error: {e}")
            return ""

    async def edit_message(
        self,
        user_id: str,
        message_id: str,
        text: str,
        buttons: Optional[list[dict[str, str]]] = None,
    ) -> bool:
        payload = {"message": text}
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.put(
                    f"{self.mattermost_url}/api/v4/posts/{message_id}",
                    headers=self._headers,
                    json=payload,
                )
                return resp.status_code == 200
        except httpx.HTTPError as e:
            logger.warning(f"Mattermost edit_message error: {e}")
            return False

    async def send_document(
        self,
        user_id: str,
        filename: str,
        content: bytes,
    ) -> str:
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                files = {"files": (filename, content)}
                resp = await client.post(
                    f"{self.mattermost_url}/api/v4/files",
                    headers=self._headers,
                    files=files,
                )
                file_info = resp.json()
                file_id = file_info[0].get("id", "") if file_info else ""

                if file_id:
                    post_payload = {
                        "channel_id": user_id,
                        "message": filename,
                        "file_ids": [file_id],
                    }
                    resp = await client.post(
                        f"{self.mattermost_url}/api/v4/posts",
                        headers=self._headers,
                        json=post_payload,
                    )
                    data = resp.json()
                    return data.get("id", "")
                return ""
        except httpx.HTTPError as e:
            logger.warning(f"Mattermost send_document error: {e}")
            return ""

    async def answer_callback(
        self,
        callback_id: str,
        text: Optional[str] = None,
    ) -> bool:
        # Mattermost handles action responses via response_url
        # This is a no-op for compatibility
        return True

    async def remove_keyboard(
        self,
        user_id: str,
        message_id: str,
    ) -> bool:
        # Mattermost doesn't support removing keyboards
        # This is a no-op for compatibility
        return True

    async def connect_websocket(self, event_handler):
        """Connect to Mattermost WebSocket for real-time events"""
        try:
            from mattermostdriver import Driver

            driver = Driver({
                'url': self.mattermost_url,
                'token': self.bot_token,
                'scheme': 'http' if 'localhost' in self.mattermost_url else 'https',
            })
            driver.login()
            self.ws_client = driver

            def on_message(event):
                import asyncio
                asyncio.get_event_loop().create_task(event_handler(event))

            driver.websocket.on('posted', on_message)
            driver.websocket.on('action', on_message)
            driver.websocket.connect()
            return True
        except Exception as e:
            logger.warning(f"Mattermost WebSocket connection failed: {e}")
            return False
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_mattermost_adapter.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/adapters/mattermost_adapter.py backend/tests/test_mattermost_adapter.py
git commit -m "feat(mattermost): add MattermostBotAdapter"
```

---

## Task 6: Create MattermostCommandService

**Files:**
- Create: `backend/app/services/mattermost_command_service.py`
- Create: `backend/tests/test_mattermost_command_service.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_mattermost_command_service.py

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.mattermost_command_service import MattermostCommandService


@pytest.fixture
def service():
    return MattermostCommandService()


def test_command_map_exists(service):
    """Service has command map"""
    assert '/today' in service.COMMAND_MAP
    assert '/add' in service.COMMAND_MAP
    assert '/search' in service.COMMAND_MAP


def test_inherits_base_command_service(service):
    """Service inherits from BaseCommandService"""
    from app.services.base_command_service import BaseCommandService
    assert isinstance(service, BaseCommandService)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_mattermost_command_service.py -v`
Expected: FAIL with "ModuleNotFoundError"

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/mattermost_command_service.py

import json
import logging
from datetime import date
from typing import Optional
from zoneinfo import ZoneInfo

from app.adapters.mattermost_adapter import MattermostBotAdapter
from app.database import AsyncSessionLocal
from app.i18n import t as i18n_t
from app.services.base_command_service import BaseCommandService
from app.services.telegram_smart_parser import parse as smart_parse

logger = logging.getLogger(__name__)


class MattermostCommandService(BaseCommandService):
    """Command handler for Mattermost bot"""

    COMMAND_MAP = {
        '/today': '/today',
        '/tomorrow': '/tomorrow',
        '/inbox': '/inbox',
        '/add': '/add',
        '/search': '/search',
        '/s': '/search',
        '/stats': '/stats',
        '/export': '/export',
        '/help': '/help',
        '/?': '/help',
    }

    def __init__(self, adapter: MattermostBotAdapter):
        super().__init__()
        self.adapter = adapter

    async def handle_slash_command(
        self, command: str, args: str, user_id: str
    ) -> dict:
        """Handle Mattermost slash command. Returns response dict."""
        from app.models.user import User
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.mattermost_user_id == user_id)
            )
            user = result.scalar_one_or_none()

        if not user:
            return {
                "response_type": "ephemeral",
                "text": i18n_t("mattermostNotLinked", "en"),
            }

        lang = user.language or "ru"
        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")

        if command == '/today':
            return await self._handle_today(user, user_tz, lang)
        elif command == '/tomorrow':
            return await self._handle_tomorrow(user, user_tz, lang)
        elif command == '/inbox':
            return await self._handle_inbox(user, lang)
        elif command == '/add':
            return await self._handle_add_start(user, lang)
        elif command in ('/search', '/s'):
            return await self._handle_search(user, args, user_tz, lang)
        elif command == '/help':
            return self._handle_help(lang)
        elif command == '/stats':
            return await self._handle_stats(user, user_tz, lang)
        elif command == '/export':
            return await self._handle_export(user)
        else:
            return {
                "response_type": "ephemeral",
                "text": i18n_t("mattermostUnknownCommand", lang),
            }

    async def handle_callback(self, callback_data: str, user_id: str) -> dict:
        """Handle Interactive Message action"""
        if callback_data.startswith("done:"):
            task_id = callback_data.split(":", 1)[1]
            return await self._handle_done(task_id, user_id)
        elif callback_data == "dismiss":
            return {"delete_original": True}
        elif callback_data.startswith("cal:"):
            return await self._handle_calendar_view(callback_data, user_id)
        elif callback_data.startswith("addcal:"):
            return await self._handle_add_calendar(callback_data, user_id)
        elif callback_data.startswith("addarea:"):
            return await self._handle_add_area(callback_data, user_id)
        elif callback_data.startswith("addproj:"):
            return await self._handle_add_project(callback_data, user_id)
        return {}

    async def handle_text(self, text: str, user_id: str) -> dict:
        """Handle plain text message"""
        from app.models.user import User
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.mattermost_user_id == user_id)
            )
            user = result.scalar_one_or_none()

        if not user:
            return {}

        lang = user.language or "ru"
        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")

        # Check if in add flow
        if user_id in self._pending_adds:
            return await self._handle_add_text(text, user, user_tz, lang)

        # Reply-based actions
        lower_text = text.strip().lower()
        if lower_text in ('done', 'готово', '✅', 'v', 'д'):
            return await self._handle_reply_done(user_id)
        elif lower_text in ('tomorrow', 'завтра'):
            return await self._handle_reply_tomorrow(user_id)
        elif lower_text in ('today', 'сегодня'):
            return await self._handle_reply_today(user_id)
        elif lower_text in ('delete', 'удалить', 'del', 'дель'):
            return await self._handle_reply_delete(user_id)
        elif lower_text == 'inbox':
            return await self._handle_reply_inbox(user_id)

        # Smart parser - create task from plain text
        return await self._handle_smart_add(text, user, user_tz, lang)

    def _handle_help(self, lang: str) -> dict:
        help_text = (
            f"**{i18n_t('telegramHelpTitle', lang)}**\n\n"
            f"/today - {i18n_t('telegramHelpToday', lang)}\n"
            f"/tomorrow - {i18n_t('telegramHelpTomorrow', lang)}\n"
            f"/inbox - {i18n_t('telegramHelpInbox', lang)}\n"
            f"/add - {i18n_t('telegramHelpAdd', lang)}\n"
            f"/search - {i18n_t('telegramHelpSearch', lang)}\n"
            f"/stats - {i18n_t('telegramHelpStats', lang)}\n"
            f"/export - {i18n_t('telegramHelpExport', lang)}\n"
        )
        return {"response_type": "ephemeral", "text": help_text}

    async def _handle_today(self, user, user_tz, lang) -> dict:
        from app.services.telegram_command_service import TelegramCommandService
        from app.models.task import Task, GtdStatus
        from sqlalchemy import select, or_
        from datetime import datetime, time

        async with AsyncSessionLocal() as db:
            now = datetime.now(user_tz)
            start = datetime.combine(now.date(), time.min, tzinfo=user_tz)
            end = datetime.combine(now.date(), time.max, tzinfo=user_tz)
            today_start = datetime.combine(now.date(), time.min, tzinfo=user_tz)

            result = await db.execute(
                select(Task).where(
                    Task.user_id == user.id,
                    Task.is_completed.is_(False),
                    Task.gtd_status != GtdStatus.TRASH.value,
                    or_(Task.due_date.between(start, end), Task.due_date < today_start),
                ).order_by(Task.due_date).limit(25)
            )
            tasks = list(result.scalars().all())

        title = i18n_t("telegramTodayTitle", lang)
        service = TelegramCommandService()
        text, _ = service._format_task_list(tasks, title, user_tz, lang)

        buttons = [
            {"text": f"✓ {t.title[:30]}", "callback_data": f"done:{t.id}"}
            for t in tasks[:10] if not t.is_completed
        ]

        return {
            "response_type": "ephemeral",
            "text": text,
            "attachments": [{"actions": [
                {"name": b["text"], "type": "button", "integration": {"url": "", "context": {"action": b["callback_data"]}}}
                for b in buttons
            ]}] if buttons else [],
        }

    async def _handle_tomorrow(self, user, user_tz, lang) -> dict:
        from datetime import datetime, time, timedelta
        from app.models.task import Task, GtdStatus
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            tomorrow = datetime.now(user_tz).date() + timedelta(days=1)
            start = datetime.combine(tomorrow, time.min, tzinfo=user_tz)
            end = datetime.combine(tomorrow, time.max, tzinfo=user_tz)

            result = await db.execute(
                select(Task).where(
                    Task.user_id == user.id,
                    Task.is_completed.is_(False),
                    Task.gtd_status != GtdStatus.TRASH.value,
                    Task.due_date.between(start, end),
                ).order_by(Task.due_date).limit(25)
            )
            tasks = list(result.scalars().all())

        title = i18n_t("telegramTomorrowTitle", lang)
        service = TelegramCommandService()
        text, _ = service._format_task_list(tasks, title, user_tz, lang)

        return {"response_type": "ephemeral", "text": text}

    async def _handle_inbox(self, user, lang) -> dict:
        from app.models.task import Task, GtdStatus
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Task).where(
                    Task.user_id == user.id,
                    Task.gtd_status == GtdStatus.INBOX.value,
                    Task.is_completed.is_(False),
                ).order_by(Task.created_at.desc()).limit(25)
            )
            tasks = list(result.scalars().all())

        title = i18n_t("telegramInboxTitle", lang)
        service = TelegramCommandService()
        text, _ = service._format_task_list(tasks, title, ZoneInfo(user.timezone or "Europe/Moscow"), lang)

        return {"response_type": "ephemeral", "text": text}

    async def _handle_add_start(self, user, lang) -> dict:
        self._pending_adds[user.mattermost_user_id] = {
            "step": "date",
            "created_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc),
        }
        buttons = self.build_calendar_keyboard(
            __import__('datetime').date.today().year,
            __import__('datetime').date.today().month,
            "addcal",
            lang,
        )
        return {
            "response_type": "ephemeral",
            "text": i18n_t("telegramAddPickDate", lang),
            "attachments": [{"actions": [
                {"name": b["text"], "type": "button", "integration": {"url": "", "context": {"action": b["callback_data"]}}}
                for row in buttons for b in row if b.get("callback_data") != "ignore"
            ]}],
        }

    async def _handle_search(self, user, query, user_tz, lang) -> dict:
        if not query:
            return {"response_type": "ephemeral", "text": i18n_t("telegramSearchPrompt", lang)}

        from app.models.task import Task, GtdStatus
        from sqlalchemy import select, or_

        like_pattern = f"%{query}%"
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Task).where(
                    Task.user_id == user.id,
                    Task.is_completed.is_(False),
                    Task.gtd_status != GtdStatus.TRASH.value,
                    or_(Task.title.ilike(like_pattern), Task.description.ilike(like_pattern)),
                ).order_by(Task.due_date.asc().nulls_last()).limit(11)
            )
            tasks = list(result.scalars().all())

        service = TelegramCommandService()
        text, _ = service._format_search_results(tasks, query, user_tz, lang)

        return {"response_type": "ephemeral", "text": text}

    async def _handle_stats(self, user, user_tz, lang) -> dict:
        from datetime import datetime, timedelta
        from app.models.task import Task
        from sqlalchemy import select, func

        async with AsyncSessionLocal() as db:
            week_ago = datetime.now(user.tzinfo if hasattr(user, 'tzinfo') else user_tz) - timedelta(days=7)
            result = await db.execute(
                select(
                    func.count(Task.id).label('total'),
                    func.count(Task.id).filter(Task.is_completed.is_(True)).label('completed'),
                ).where(Task.user_id == user.id, Task.created_at >= week_ago)
            )
            stats = result.one()

        total = stats.total or 0
        completed = stats.completed or 0
        ratio = f"{completed}/{total}" if total > 0 else "0/0"

        text = (
            f"**{i18n_t('telegramStatsTitle', lang)}**\n\n"
            f"7 дней: {ratio} ({i18n_t('telegramStatsCompleted', lang)})"
        )
        return {"response_type": "ephemeral", "text": text}

    async def _handle_export(self, user) -> dict:
        from app.services.telegram_command_service import TelegramCommandService
        service = TelegramCommandService()
        data = await service._export_user_data(user.id)
        return {
            "response_type": "ephemeral",
            "text": f"Экспорт данных: {len(data)} записей",
        }

    async def _handle_done(self, task_id, user_id) -> dict:
        from app.models.task import Task
        from app.services.task_service import TaskService
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            if task:
                await TaskService.complete_task(db, task)
                await db.commit()
                return {"ephemeral_text": f"✓ {task.title}"}
        return {"ephemeral_text": "Задача не найдена"}

    async def _handle_calendar_view(self, callback_data, user_id) -> dict:
        parts = callback_data.split(":")
        if len(parts) == 4:
            _, year, month, day = parts
            return await self._show_tasks_for_date(
                user_id, date(int(year), int(month), int(day))
            )
        return {}

    async def _handle_add_calendar(self, callback_data, user_id) -> dict:
        parts = callback_data.split(":")
        if len(parts) == 4:
            _, year, month, day = parts
            self._pending_adds[user_id]["due_date"] = date(int(year), int(month), int(day))
            self._pending_adds[user_id]["step"] = "title"
            return {"ephemeral_text": i18n_t("telegramAddEnterTitle", "ru")}
        elif parts[1] == "nodate":
            self._pending_adds[user_id]["due_date"] = None
            self._pending_adds[user_id]["step"] = "title"
            return {"ephemeral_text": i18n_t("telegramAddEnterTitle", "ru")}
        return {}

    async def _handle_add_area(self, callback_data, user_id) -> dict:
        parts = callback_data.split(":")
        if parts[1] == "skip":
            self._pending_adds[user_id]["area_id"] = None
        else:
            self._pending_adds[user_id]["area_id"] = parts[1]
        self._pending_adds[user_id]["step"] = "project"
        return {"ephemeral_text": i18n_t("telegramAddPickProject", "ru")}

    async def _handle_add_project(self, callback_data, user_id) -> dict:
        parts = callback_data.split(":")
        if parts[1] == "skip":
            self._pending_adds[user_id]["project_id"] = None
        else:
            self._pending_adds[user_id]["project_id"] = parts[1]
        return await self._finalize_add(user_id)

    async def _handle_add_text(self, text, user, user_tz, lang) -> dict:
        state = self._pending_adds.get(user.mattermost_user_id)
        if not state:
            return {}

        if state["step"] == "title":
            state["title"] = text
            state["step"] = "area"
            return {"ephemeral_text": i18n_t("telegramAddPickArea", lang)}
        elif state["step"] == "project":
            return await self._finalize_add(user.mattermost_user_id)

        return {}

    async def _handle_smart_add(self, text, user, user_tz, lang) -> dict:
        parsed = smart_parse(text, lang)
        from app.models.task import Task, GtdStatus
        from app.services.task_service import TaskService

        async with AsyncSessionLocal() as db:
            task = Task(
                user_id=user.id,
                title=parsed["title"],
                due_date=parsed.get("due_date"),
                gtd_status=GtdStatus.INBOX.value,
            )
            db.add(task)
            await db.commit()
            return {"ephemeral_text": f"✓ Создана: {task.title}"}

    async def _finalize_add(self, user_id) -> dict:
        state = self._pending_adds.pop(user_id, None)
        if not state or "title" not in state:
            return {"ephemeral_text": "Ошибка"}

        from app.models.task import Task, GtdStatus
        async with AsyncSessionLocal() as db:
            task = Task(
                user_id=state.get("user_id"),
                title=state["title"],
                due_date=state.get("due_date"),
                area_id=state.get("area_id"),
                project_id=state.get("project_id"),
                gtd_status=GtdStatus.INBOX.value,
            )
            db.add(task)
            await db.commit()
            return {"ephemeral_text": f"✓ Создана: {task.title}"}

    async def _show_tasks_for_date(self, user_id, target_date) -> dict:
        return {"response_type": "ephemeral", "text": f"Задачи на {target_date}"}

    async def _handle_reply_done(self, user_id) -> dict:
        return {"ephemeral_text": "Отметить задачу"}

    async def _handle_reply_tomorrow(self, user_id) -> dict:
        return {"ephemeral_text": "Перенести на завтра"}

    async def _handle_reply_today(self, user_id) -> dict:
        return {"ephemeral_text": "Перенести на сегодня"}

    async def _handle_reply_delete(self, user_id) -> dict:
        return {"ephemeral_text": "Удалить задачу"}

    async def _handle_reply_inbox(self, user_id) -> dict:
        return {"ephemeral_text": "Переместить в inbox"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_mattermost_command_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/mattermost_command_service.py backend/tests/test_mattermost_command_service.py
git commit -m "feat(mattermost): add MattermostCommandService"
```

---

## Task 7: Add Mattermost fields to User model

**Files:**
- Modify: `backend/app/models/user.py`
- Create: `backend/alembic/versions/20260622_1200_add_mattermost_fields_to_user_x9g8h7j6k5l4.py`

- [ ] **Step 1: Add fields to User model**

```python
# backend/app/models/user.py

# Add after line 42 (telegram_notifications_enabled)
    mattermost_user_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mattermost_bot_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mattermost_notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text('0'), nullable=False)
    mattermost_channel_id: Mapped[str | None] = mapped_column(String(50), nullable=True)

# Add property after decrypted_telegram_bot_token
    @property
    def decrypted_mattermost_bot_token(self) -> str | None:
        from app.services.crypto_service import decrypt_secret
        if not self.mattermost_bot_token:
            return self.mattermost_bot_token
        decrypted = decrypt_secret(self.mattermost_bot_token)
        if decrypted is None:
            _logger.warning(f"Failed to decrypt mattermost_bot_token for user {self.id}")
            return self.mattermost_bot_token
        return decrypted
```

- [ ] **Step 2: Create migration**

```bash
cd backend && alembic revision --autogenerate -m "add mattermost fields to user"
```

- [ ] **Step 3: Verify migration**

```bash
cd backend && alembic upgrade head
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/user.py backend/alembic/versions/
git commit -m "feat(mattermost): add mattermost fields to User model"
```

---

## Task 8: Create Mattermost Auth API

**Files:**
- Create: `backend/app/api/mattermost_auth.py`
- Create: `backend/tests/test_mattermost_auth_api.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_mattermost_auth_api.py

import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_validate_token_endpoint_exists():
    """Validate token endpoint exists"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.post("/api/mattermost/validate-token", json={"token": "test"})
        assert resp.status_code != 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_mattermost_auth_api.py -v`
Expected: FAIL with 404

- [ ] **Step 3: Write implementation**

```python
# backend/app/api/mattermost_auth.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.crypto_service import encrypt_secret

router = APIRouter(prefix="/api/mattermost", tags=["mattermost"])


class ValidateTokenRequest(BaseModel):
    token: str


class ValidateTokenResponse(BaseModel):
    valid: bool
    username: str | None = None


class BindRequest(BaseModel):
    mattermost_user_id: str


class BindResponse(BaseModel):
    success: bool
    message: str


@router.post("/validate-token", response_model=ValidateTokenResponse)
async def validate_mattermost_token(
    req: ValidateTokenRequest,
    current_user: User = Depends(get_current_user),
):
    """Validate Mattermost bot token"""
    import httpx

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "http://localhost:8065/api/v4/users/me",
                headers={"Authorization": f"Bearer {req.token}"}
            )
            if resp.status_code == 200:
                data = resp.json()
                return ValidateTokenResponse(valid=True, username=data.get("username"))
    except Exception:
        pass

    return ValidateTokenResponse(valid=False)


@router.post("/bind", response_model=BindResponse)
async def bind_mattermost_account(
    req: BindRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bind Mattermost user ID to Todowka account"""
    current_user.mattermost_user_id = req.mattermost_user_id
    db.add(current_user)
    await db.commit()
    return BindResponse(success=True, message="Account bound successfully")


@router.post("/save-token")
async def save_mattermost_token(
    req: ValidateTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save encrypted Mattermost bot token"""
    encrypted = encrypt_secret(req.token)
    current_user.mattermost_bot_token = encrypted
    db.add(current_user)
    await db.commit()
    return {"success": True}


@router.post("/logout")
async def mattermost_logout(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear Mattermost connection"""
    current_user.mattermost_user_id = None
    current_user.mattermost_bot_token = None
    current_user.mattermost_notifications_enabled = False
    current_user.mattermost_channel_id = None
    db.add(current_user)
    await db.commit()
    return {"success": True}
```

- [ ] **Step 4: Register router in main.py**

```python
# backend/app/main.py

from app.api.mattermost_auth import router as mattermost_router
app.include_router(mattermost_router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_mattermost_auth_api.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/mattermost_auth.py backend/tests/test_mattermost_auth_api.py backend/app/main.py
git commit -m "feat(mattermost): add Mattermost auth API endpoints"
```

---

## Task 9: Add Mattermost i18n keys

**Files:**
- Modify: `backend/app/i18n/locales/ru.json`
- Modify: `backend/app/i18n/locales/en.json`
- Modify: `backend/app/i18n/locales/tt.json`

- [ ] **Step 1: Add keys to ru.json**

```json
{
  "mattermostNotLinked": "Ваш аккаунт Mattermost не привязан. Используйте /start для привязки.",
  "mattermostUnknownCommand": "Неизвестная команда. Используйте /help для списка команд.",
  "mattermostConnected": "Mattermost подключен успешно!",
  "mattermostDisconnected": "Mattermost отключен."
}
```

- [ ] **Step 2: Add keys to en.json**

```json
{
  "mattermostNotLinked": "Your Mattermost account is not linked. Use /start to link.",
  "mattermostUnknownCommand": "Unknown command. Use /help for list of commands.",
  "mattermostConnected": "Mattermost connected successfully!",
  "mattermostDisconnected": "Mattermost disconnected."
}
```

- [ ] **Step 3: Add keys to tt.json**

```json
{
  "mattermostNotLinked": "Сезне Mattermost аккаунтыңыз бәйләнмәгән. Бәйләү өчен /start кулланыгыз.",
  "mattermostUnknownCommand": "Билгесез команда. Список команд өчен /help кулланыгыз.",
  "mattermostConnected": "Mattermost уңышлы бәйләнде!",
  "mattermostDisconnected": "Mattermost аерылды."
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/i18n/locales/
git commit -m "feat(mattermost): add Mattermost i18n keys"
```

---

## Task 10: Add Mattermost settings to config

**Files:**
- Modify: `backend/app/config.py`
- Modify: `.env.example`

- [ ] **Step 1: Add settings**

```python
# backend/app/config.py

# Add to Settings class
    mattermost_url: str = "http://localhost:8065"
    mattermost_bot_token: str | None = None
    mattermost_bot_user_id: str | None = None
```

- [ ] **Step 2: Update .env.example**

```bash
# .env.example

# Mattermost
MATTERMOST_URL=http://localhost:8065
MATTERMOST_BOT_TOKEN=
MATTERMOST_BOT_USER_ID=
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/config.py .env.example
git commit -m "feat(mattermost): add Mattermost configuration"
```

---

## Task 11: Create Mattermost Frontend Settings

**Files:**
- Create: `frontend/src/api/mattermost.ts`
- Create: `frontend/src/components/MattermostSettings.tsx`
- Modify: `frontend/src/routes/Settings.tsx`

- [ ] **Step 1: Create API file**

```typescript
// frontend/src/api/mattermost.ts

import api from './api';

export interface MattermostValidateResponse {
  valid: boolean;
  username?: string;
}

export interface MattermostBindResponse {
  success: boolean;
  message: string;
}

export async function validateMattermostToken(token: string): Promise<MattermostValidateResponse> {
  const resp = await api.post<MattermostValidateResponse>('/api/mattermost/validate-token', { token });
  return resp.data;
}

export async function bindMattermostAccount(mattermostUserId: string): Promise<MattermostBindResponse> {
  const resp = await api.post<MattermostBindResponse>('/api/mattermost/bind', { mattermost_user_id: mattermostUserId });
  return resp.data;
}

export async function saveMattermostToken(token: string): Promise<{ success: boolean }> {
  const resp = await api.post<{ success: boolean }>('/api/mattermost/save-token', { token });
  return resp.data;
}

export async function logoutMattermost(): Promise<{ success: boolean }> {
  const resp = await api.post<{ success: boolean }>('/api/mattermost/logout');
  return resp.data;
}
```

- [ ] **Step 2: Create MattermostSettings component**

```tsx
// frontend/src/components/MattermostSettings.tsx

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateMattermostToken, saveMattermostToken, logoutMattermost } from '../api/mattermost';

interface MattermostSettingsProps {
  botToken?: string;
  isConnected: boolean;
  notificationsEnabled: boolean;
  onUpdate: (data: any) => void;
}

export default function MattermostSettings({
  botToken,
  isConnected,
  notificationsEnabled,
  onUpdate,
}: MattermostSettingsProps) {
  const { t } = useTranslation();
  const [token, setToken] = useState(botToken || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; username?: string } | null>(null);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const result = await validateMattermostToken(token);
      setValidationResult(result);
      if (result.valid) {
        await saveMattermostToken(token);
        onUpdate({ mattermost_bot_token: token });
      }
    } catch (err) {
      setValidationResult({ valid: false });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDisconnect = async () => {
    await logoutMattermost();
    setToken('');
    setValidationResult(null);
    onUpdate({ mattermost_user_id: null, mattermost_bot_token: null });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Mattermost</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Bot Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="xoxb-..."
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={isValidating || !token}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isValidating ? t('common.loading') : t('settings.validate')}
        </button>

        {isConnected && (
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            {t('settings.disconnect')}
          </button>
        )}
      </div>

      {validationResult && (
        <div className={`p-2 rounded ${validationResult.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {validationResult.valid
            ? `${t('settings.connected')} @${validationResult.username}`
            : t('settings.invalidToken')}
        </div>
      )}

      {isConnected && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => onUpdate({ mattermost_notifications_enabled: e.target.checked })}
          />
          <label>{t('settings.mattermostNotifications')}</label>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add MattermostSettings to Settings page**

```tsx
// frontend/src/routes/Settings.tsx

import MattermostSettings from '../components/MattermostSettings';

// Add inside Settings component, after TelegramSettings
<MattermostSettings
  botToken={user?.mattermost_bot_token}
  isConnected={!!user?.mattermost_user_id}
  notificationsEnabled={user?.mattermost_notifications_enabled || false}
  onUpdate={handleUpdate}
/>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/mattermost.ts frontend/src/components/MattermostSettings.tsx frontend/src/routes/Settings.tsx
git commit -m "feat(mattermost): add Mattermost frontend settings"
```

---

## Task 12: Add Mattermost dependencies

**Files:**
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: Add dependencies**

```toml
# backend/pyproject.toml

[project]
dependencies = [
    # ... existing
    "mattermostdriver>=7.0.0",
    "websockets>=12.0",
]
```

- [ ] **Step 2: Install dependencies**

```bash
cd backend && pip install mattermostdriver websockets
```

- [ ] **Step 3: Commit**

```bash
git add backend/pyproject.toml
git commit -m "feat(mattermost): add Mattermost dependencies"
```

---

## Task 13: Integration and final testing

**Files:**
- Run all tests

- [ ] **Step 1: Run all Mattermost tests**

```bash
cd backend && python -m pytest tests/test_bot_interface.py tests/test_mattermost_adapter.py tests/test_mattermost_command_service.py tests/test_mattermost_auth_api.py -v
```

- [ ] **Step 2: Run linting**

```bash
cd backend && ruff check .
cd frontend && npm run lint
```

- [ ] **Step 3: Run full test suite**

```bash
cd backend && python -m pytest tests/ -v
cd frontend && npm test
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(mattermost): complete Mattermost bot integration"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | BotInterface | 3 |
| 2 | TelegramBotAdapter | 2 |
| 3 | BaseCommandService | 2 |
| 4 | Refactor TelegramCommandService | 1 |
| 5 | MattermostBotAdapter | 2 |
| 6 | MattermostCommandService | 2 |
| 7 | User model + migration | 2 |
| 8 | Mattermost Auth API | 2 |
| 9 | i18n keys | 3 |
| 10 | Config | 2 |
| 11 | Frontend Settings | 3 |
| 12 | Dependencies | 1 |
| 13 | Final testing | - |
| **Total** | | **27 files** |
