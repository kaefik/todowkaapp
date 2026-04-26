# Telegram Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Telegram notifications for task reminders. Each user creates their own bot via @BotFather, pastes the token in Settings, writes /start to the bot, and receives reminders in Telegram.

**Architecture:** Backend uses httpx (already in deps) to call Telegram Bot API directly — no python-telegram-bot. A scheduler job polls all unlinked bots every 5 seconds for /start messages. When a reminder fires, TelegramNotifierService sends a message alongside the existing SSE/browser notification.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), Alembic, httpx (backend) / React 18, TypeScript, Tailwind CSS 4, i18next (frontend)

---

## File Structure

### Backend — new files
| File | Responsibility |
|------|---------------|
| `backend/app/services/telegram_notifier.py` | Telegram Bot API calls (validate, poll, send) |
| `backend/alembic/versions/xxx_add_telegram_fields_to_user.py` | Migration for 3 new columns |

### Backend — modified files
| File | Change |
|------|--------|
| `backend/app/models/user.py` | Add 3 telegram fields |
| `backend/app/schemas/user.py` | Add fields to UserResponse/UserUpdate |
| `backend/app/api/users.py` | Add validate-token endpoint |
| `backend/app/scheduler.py` | Add poll_telegram_bots job + integrate in send_due_reminders |

### Frontend — modified files
| File | Change |
|------|--------|
| `frontend/src/api/users.ts` | Add validateTelegramToken method + User type fields |
| `frontend/src/stores/authStore.ts` | Add telegram fields to User interface |
| `frontend/src/routes/Settings.tsx` | Add Telegram section on General tab |
| `frontend/src/i18n/locales/ru/settings.json` | Add Telegram i18n keys |
| `frontend/src/i18n/locales/en/settings.json` | Add Telegram i18n keys |

### Documentation — modified files
| File | Change |
|------|--------|
| `docs/features.md` | Document Telegram notifications feature |

---

## Task 1: Backend — Add telegram fields to User model + migration

**Files:**
- Modify: `backend/app/models/user.py`
- Create: `backend/alembic/versions/xxx_add_telegram_fields_to_user.py`

- [ ] **Step 1: Add fields to User model**

In `backend/app/models/user.py`, add three fields after `password_changed_at` (line 23):

```python
    telegram_bot_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    telegram_notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text('0'), nullable=False)
```

- [ ] **Step 2: Generate migration**

Run:
```bash
cd backend && alembic revision --autogenerate -m "add_telegram_fields_to_user"
```

Verify the generated migration adds three columns: `telegram_bot_token` (String 255, nullable), `telegram_chat_id` (String 50, nullable), `telegram_notifications_enabled` (Boolean, server_default='0').

- [ ] **Step 3: Apply migration**

Run:
```bash
cd backend && alembic upgrade head
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/user.py backend/alembic/versions/
git commit -m "feat: add telegram fields to User model"
```

---

## Task 2: Backend — TelegramNotifierService

**Files:**
- Create: `backend/app/services/telegram_notifier.py`

- [ ] **Step 1: Create the service**

```python
# backend/app/services/telegram_notifier.py
import logging
from typing import TYPE_CHECKING

import httpx

if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.user import User

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org/bot{token}/{method}"
HTTPX_TIMEOUT = 10.0


class TelegramNotifierService:
    @staticmethod
    async def validate_token(bot_token: str) -> dict | None:
        url = TELEGRAM_API_BASE.format(token=bot_token, method="getMe")
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.get(url)
                data = resp.json()
                if data.get("ok"):
                    return {
                        "bot_username": data["result"]["username"],
                        "bot_name": data["result"].get("first_name", ""),
                    }
                return None
        except (httpx.HTTPError, KeyError) as e:
            logger.warning(f"Telegram validate_token failed: {e}")
            return None

    @staticmethod
    async def poll_updates(bot_token: str, offset: int | None = None) -> tuple[list[dict], int | None]:
        url = TELEGRAM_API_BASE.format(token=bot_token, method="getUpdates")
        params: dict = {"timeout": 0}
        if offset is not None:
            params["offset"] = offset
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.get(url, params=params)
                data = resp.json()
                if not data.get("ok"):
                    return [], offset
                updates = data.get("result", [])
                new_offset = (updates[-1]["update_id"] + 1) if updates else offset
                return updates, new_offset
        except (httpx.HTTPError, KeyError, IndexError) as e:
            logger.warning(f"Telegram poll_updates failed: {e}")
            return [], offset

    @staticmethod
    async def send_message(bot_token: str, chat_id: str, text: str) -> bool:
        url = TELEGRAM_API_BASE.format(token=bot_token, method="sendMessage")
        payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.post(url, json=payload)
                data = resp.json()
                if resp.status_code == 403:
                    logger.warning(f"Telegram bot blocked by user chat_id={chat_id}")
                    return False
                if not data.get("ok"):
                    logger.warning(f"Telegram sendMessage failed: {data}")
                    return False
                return True
        except httpx.HTTPError as e:
            logger.warning(f"Telegram send_message error: {e}")
            return False

    @staticmethod
    async def send_reminder(user: 'User', task: 'Task') -> bool:
        if not user.telegram_bot_token or not user.telegram_chat_id:
            return False

        from zoneinfo import ZoneInfo

        user_tz = ZoneInfo(user.timezone or 'Europe/Moscow')
        due_date = task.due_date
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=ZoneInfo('UTC'))
        local_due = due_date.astimezone(user_tz)

        text = (
            f"\U0001f514 <b>Напоминание о задаче</b>\n\n"
            f"\U0001f4cb {task.title}\n"
            f"\U0001f4c5 Дедлайн: {local_due.strftime('%d.%m.%Y %H:%M')}"
        )

        success = await TelegramNotifierService.send_message(
            user.telegram_bot_token, user.telegram_chat_id, text
        )

        if not success:
            logger.warning(f"Failed to send Telegram reminder to user {user.id}")

        return success
```

- [ ] **Step 2: Verify ruff passes**

Run:
```bash
cd backend && ruff check app/services/telegram_notifier.py
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/telegram_notifier.py
git commit -m "feat: add TelegramNotifierService"
```

---

## Task 3: Backend — Update Pydantic schemas

**Files:**
- Modify: `backend/app/schemas/user.py`

- [ ] **Step 1: Add telegram fields to UserResponse**

In `backend/app/schemas/user.py`, add fields to `UserResponse` (after `default_section` line 30):

```python
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    telegram_notifications_enabled: bool = False
```

Add a model_validator to mask the bot token in UserResponse:

```python
from pydantic import model_validator

    @model_validator(mode='after')
    def mask_telegram_token(self) -> 'UserResponse':
        if self.telegram_bot_token and len(self.telegram_bot_token) > 5:
            self.telegram_bot_token = '*****' + self.telegram_bot_token[-5:]
        return self
```

- [ ] **Step 2: Add telegram fields to UserUpdate**

Add to `UserUpdate` class (after `password` field):

```python
    telegram_bot_token: str | None = None
    telegram_notifications_enabled: bool | None = None
```

- [ ] **Step 3: Verify ruff passes**

Run:
```bash
cd backend && ruff check app/schemas/user.py
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/user.py
git commit -m "feat: add telegram fields to user schemas"
```

---

## Task 4: Backend — API endpoint for validating Telegram token

**Files:**
- Modify: `backend/app/api/users.py`

- [ ] **Step 1: Add validate-token endpoint**

Add at the end of `backend/app/api/users.py`:

```python
from pydantic import BaseModel


class TelegramTokenRequest(BaseModel):
    telegram_bot_token: str


class TelegramTokenResponse(BaseModel):
    valid: bool
    bot_username: str | None = None
    bot_name: str | None = None
    error: str | None = None


@users_router.post("/telegram/validate-token", response_model=TelegramTokenResponse)
async def validate_telegram_token(
    data: TelegramTokenRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> TelegramTokenResponse:
    from app.services.telegram_notifier import TelegramNotifierService

    if not data.telegram_bot_token or not data.telegram_bot_token.strip():
        return TelegramTokenResponse(valid=False, error="Token is empty")

    result = await TelegramNotifierService.validate_token(data.telegram_bot_token.strip())
    if result:
        return TelegramTokenResponse(
            valid=True,
            bot_username=result["bot_username"],
            bot_name=result["bot_name"],
        )
    return TelegramTokenResponse(valid=False, error="Invalid token or Telegram API unreachable")
```

Note: `Annotated`, `Depends`, `get_current_user`, `User` are already imported at the top of the file.

- [ ] **Step 2: Verify ruff passes**

Run:
```bash
cd backend && ruff check app/api/users.py
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/users.py
git commit -m "feat: add telegram validate-token endpoint"
```

---

## Task 5: Backend — Handle telegram_bot_token in update_current_user

**Files:**
- Modify: `backend/app/api/users.py`

- [ ] **Step 1: Reset chat_id when token changes**

In `update_current_user` function (line 120), after `update_data = data.model_dump(exclude_unset=True)` and before the password check, add logic to reset chat_id when bot token changes:

```python
    if 'telegram_bot_token' in update_data:
        new_token = update_data['telegram_bot_token']
        if new_token != current_user.telegram_bot_token:
            update_data['telegram_chat_id'] = None
            update_data['telegram_notifications_enabled'] = False
```

- [ ] **Step 2: Verify ruff passes**

Run:
```bash
cd backend && ruff check app/api/users.py
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/users.py
git commit -m "feat: reset telegram_chat_id on token change"
```

---

## Task 6: Backend — Scheduler job for polling Telegram bots

**Files:**
- Modify: `backend/app/scheduler.py`

- [ ] **Step 1: Add _offsets class variable and poll job registration**

In `TaskScheduler.__init__`, add nothing (offsets will be module-level dict).

In `TaskScheduler.startup`, after the `reminder_recovery` job registration (around line 81), add:

```python
            self.scheduler.add_job(
                _job_poll_telegram_bots,
                'interval',
                seconds=5,
                id='poll_telegram_bots',
                replace_existing=True,
                max_instances=1,
            )
```

- [ ] **Step 2: Add module-level offset dict and poll job**

Add at module level (after `task_scheduler = TaskScheduler()` at the end of the file):

```python
_telegram_poll_offsets: dict[str, int] = {}
```

Add the job function before `task_scheduler = TaskScheduler()`:

```python
async def _job_poll_telegram_bots():
    logger.info("Running job: poll_telegram_bots")

    try:
        from app.services.telegram_notifier import TelegramNotifierService

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(
                    User.telegram_bot_token.isnot(None),
                    User.telegram_bot_token != '',
                    User.telegram_chat_id.is_(None),
                )
            )
            users = list(result.scalars().all())

            for user in users:
                try:
                    offset = _telegram_poll_offsets.get(str(user.id))
                    updates, new_offset = await TelegramNotifierService.poll_updates(
                        user.telegram_bot_token, offset
                    )
                    if new_offset is not None:
                        _telegram_poll_offsets[str(user.id)] = new_offset

                    for update in updates:
                        message = update.get("message", {})
                        text = message.get("text", "").strip()
                        chat_id = str(message.get("chat", {}).get("id", ""))

                        if text == "/start" and chat_id:
                            user.telegram_chat_id = chat_id
                            user.telegram_notifications_enabled = True
                            await session.commit()
                            logger.info(
                                f"Telegram chat_id {chat_id} linked for user {user.username}"
                            )

                            await TelegramNotifierService.send_message(
                                user.telegram_bot_token,
                                chat_id,
                                "✅ Бот Todowka подключён! Теперь вы будете получать напоминания о задачах.",
                            )
                            break

                except Exception as e:
                    logger.error(f"Error polling bot for user {user.id}: {e}")

    except Exception as e:
        logger.error(f"Error in poll_telegram_bots: {e}")
```

Also add `from app.models.user import User` to the existing imports at the top of scheduler.py (it already imports Task).

- [ ] **Step 3: Verify ruff passes**

Run:
```bash
cd backend && ruff check app/scheduler.py
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/scheduler.py
git commit -m "feat: add scheduler job for polling telegram bots"
```

---

## Task 7: Backend — Integrate Telegram into reminder sending

**Files:**
- Modify: `backend/app/scheduler.py`

- [ ] **Step 1: Add Telegram sending in _job_send_due_reminders**

In `_job_send_due_reminders`, after the `event_bus.publish(...)` call (around line 203), add:

```python
                            if (
                                user.telegram_notifications_enabled
                                and user.telegram_chat_id
                                and user.telegram_bot_token
                            ):
                                try:
                                    from app.services.telegram_notifier import (
                                        TelegramNotifierService,
                                    )

                                    await TelegramNotifierService.send_reminder(user, task)
                                except Exception as tg_err:
                                    logger.error(
                                        f"Telegram send failed for user {user.username}: {tg_err}"
                                    )
```

- [ ] **Step 2: Add same logic in _job_reminder_recovery**

In `_job_reminder_recovery`, after the `event_bus.publish(...)` call (around line 124), add the same Telegram sending block:

```python
                            if (
                                task.user.telegram_notifications_enabled
                                and task.user.telegram_chat_id
                                and task.user.telegram_bot_token
                            ):
                                try:
                                    from app.services.telegram_notifier import (
                                        TelegramNotifierService,
                                    )

                                    await TelegramNotifierService.send_reminder(
                                        task.user, task
                                    )
                                except Exception as tg_err:
                                    logger.error(
                                        f"Telegram send failed for user {task.user.username}: {tg_err}"
                                    )
```

- [ ] **Step 3: Verify ruff passes**

Run:
```bash
cd backend && ruff check app/scheduler.py
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/scheduler.py
git commit -m "feat: integrate telegram into reminder sending"
```

---

## Task 8: Frontend — Update User type and API client

**Files:**
- Modify: `frontend/src/stores/authStore.ts`
- Modify: `frontend/src/api/users.ts`

- [ ] **Step 1: Add telegram fields to User interface in authStore**

In `frontend/src/stores/authStore.ts`, add fields to the `User` interface (after `created_at`):

```typescript
  telegram_bot_token: string | null
  telegram_chat_id: string | null
  telegram_notifications_enabled: boolean
```

- [ ] **Step 2: Add telegram fields to User interface in api/users.ts**

In `frontend/src/api/users.ts`, add the same fields to the `User` interface:

```typescript
  telegram_bot_token: string | null
  telegram_chat_id: string | null
  telegram_notifications_enabled: boolean
```

- [ ] **Step 3: Add validateTelegramToken and update types**

In `frontend/src/api/users.ts`, add after `deleteAccount`:

```typescript
  validateTelegramToken: async (token: string): Promise<{ valid: boolean; bot_username?: string; bot_name?: string; error?: string }> => {
    const response = await httpClient.post('/users/telegram/validate-token', {
      telegram_bot_token: token,
    })
    return response.data
  },
```

Also update `updateCurrentUser` types to include telegram fields:

```typescript
  updateCurrentUser: async (data: Partial<Pick<User, 'username' | 'email' | 'timezone' | 'default_section' | 'telegram_bot_token' | 'telegram_notifications_enabled'>>): Promise<User> => {
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/stores/authStore.ts frontend/src/api/users.ts
git commit -m "feat: add telegram fields to frontend User type and API"
```

---

## Task 9: Frontend — i18n keys

**Files:**
- Modify: `frontend/src/i18n/locales/ru/settings.json`
- Modify: `frontend/src/i18n/locales/en/settings.json`

- [ ] **Step 1: Add Russian i18n keys**

In `frontend/src/i18n/locales/ru/settings.json`, add before the closing `}`:

```json
  "telegram": "Telegram",
  "telegramTitle": "Уведомления Telegram",
  "telegramDescription": "Получайте напоминания о задачах в Telegram. Создайте бота через @BotFather, вставьте токен ниже и напишите боту /start.",
  "telegramBotToken": "Токен бота",
  "telegramBotTokenPlaceholder": "123456:ABC-DEF...",
  "telegramBotTokenHint": "Получите токен у @BotFather в Telegram",
  "telegramValidateBtn": "Проверить",
  "telegramValidating": "Проверка...",
  "telegramValid": "Бот «{{name}}» (@{{username}}) найден",
  "telegramInvalid": "Невалидный токен или ошибка сети",
  "telegramSaveToken": "Сохранить токен",
  "telegramTokenSaved": "Токен сохранён. Напишите /start вашему боту в Telegram.",
  "telegramStatusNotConnected": "Не подключён",
  "telegramStatusWaiting": "Ожидает /start в Telegram",
  "telegramStatusConnected": "Подключён",
  "telegramEnableNotifications": "Telegram-уведомления",
  "telegramNotificationsEnabled": "Telegram-уведомления включены",
  "telegramNotificationsDisabled": "Telegram-уведомления отключены",
  "telegramRemoveToken": "Удалить токен",
  "telegramTokenRemoved": "Telegram-бот отключён",
  "telegramErrorSaving": "Ошибка сохранения настроек Telegram"
```

- [ ] **Step 2: Add English i18n keys**

In `frontend/src/i18n/locales/en/settings.json`, add before the closing `}`:

```json
  "telegram": "Telegram",
  "telegramTitle": "Telegram Notifications",
  "telegramDescription": "Get task reminders in Telegram. Create a bot via @BotFather, paste the token below, and send /start to the bot.",
  "telegramBotToken": "Bot token",
  "telegramBotTokenPlaceholder": "123456:ABC-DEF...",
  "telegramBotTokenHint": "Get the token from @BotFather in Telegram",
  "telegramValidateBtn": "Validate",
  "telegramValidating": "Validating...",
  "telegramValid": "Bot «{{name}}» (@{{username}}) found",
  "telegramInvalid": "Invalid token or network error",
  "telegramSaveToken": "Save token",
  "telegramTokenSaved": "Token saved. Send /start to your bot in Telegram.",
  "telegramStatusNotConnected": "Not connected",
  "telegramStatusWaiting": "Waiting for /start in Telegram",
  "telegramStatusConnected": "Connected",
  "telegramEnableNotifications": "Telegram notifications",
  "telegramNotificationsEnabled": "Telegram notifications enabled",
  "telegramNotificationsDisabled": "Telegram notifications disabled",
  "telegramRemoveToken": "Remove token",
  "telegramTokenRemoved": "Telegram bot disconnected",
  "telegramErrorSaving": "Failed to save Telegram settings"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/i18n/locales/ru/settings.json frontend/src/i18n/locales/en/settings.json
git commit -m "feat: add telegram i18n keys"
```

---

## Task 10: Frontend — Telegram section in Settings

**Files:**
- Modify: `frontend/src/routes/Settings.tsx`

- [ ] **Step 1: Add Telegram section to General tab**

Find the section with browser notifications in the General tab rendering. After the browser notifications section, add the Telegram section.

First add state variables near other state declarations (around line 60):

```typescript
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramValidating, setTelegramValidating] = useState(false)
  const [telegramValidationResult, setTelegramValidationResult] = useState<{ valid: boolean; bot_username?: string; bot_name?: string } | null>(null)
  const [telegramSaving, setTelegramSaving] = useState(false)
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null)
```

Then add the section JSX in the General tab, after the browser notifications `</div>` section:

```tsx
              <div className="space-y-4 rounded-lg border border-border p-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">{t('telegramTitle')}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t('telegramDescription')}</p>
                </div>

                {telegramMessage && (
                  <div className={`rounded-md p-2 text-xs ${telegramMessage.includes('Ошибка') || telegramMessage.includes('Error') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                    {telegramMessage}
                  </div>
                )}

                {!user?.telegram_chat_id ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={telegramToken}
                        onChange={(e) => { setTelegramToken(e.target.value); setTelegramValidationResult(null) }}
                        placeholder={t('telegramBotTokenPlaceholder')}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={async () => {
                          if (!telegramToken.trim()) return
                          setTelegramValidating(true)
                          try {
                            const result = await usersApi.validateTelegramToken(telegramToken.trim())
                            setTelegramValidationResult(result)
                            if (!result.valid) setTelegramToken('')
                          } catch { setTelegramValidationResult({ valid: false }) }
                          finally { setTelegramValidating(false) }
                        }}
                        disabled={telegramValidating || !telegramToken.trim()}
                        className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                      >
                        {telegramValidating ? t('telegramValidating') : t('telegramValidateBtn')}
                      </button>
                    </div>

                    {telegramValidationResult?.valid && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {t('telegramValid', { name: telegramValidationResult.bot_name || '', username: telegramValidationResult.bot_username || '' })}
                      </p>
                    )}
                    {telegramValidationResult && !telegramValidationResult.valid && (
                      <p className="text-xs text-red-600 dark:text-red-400">{t('telegramInvalid')}</p>
                    )}

                    <p className="text-xs text-muted-foreground">{t('telegramBotTokenHint')}</p>

                    {telegramValidationResult?.valid && (
                      <button
                        onClick={async () => {
                          setTelegramSaving(true)
                          setTelegramMessage(null)
                          try {
                            const updated = await usersApi.updateCurrentUser({ telegram_bot_token: telegramToken.trim() })
                            setCurrentUser(updated)
                            setTelegramMessage(t('telegramTokenSaved'))
                            setTelegramValidationResult(null)
                          } catch { setTelegramMessage(t('telegramErrorSaving')) }
                          finally { setTelegramSaving(false) }
                        }}
                        disabled={telegramSaving}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {telegramSaving ? '...' : t('telegramSaveToken')}
                      </button>
                    )}

                    {user?.telegram_bot_token && !user.telegram_chat_id && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">{t('telegramStatusWaiting')}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t('telegramStatusNotConnected')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                      <span>{t('telegramStatusConnected')}</span>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.telegram_notifications_enabled ?? false}
                        onChange={async (e) => {
                          try {
                            const updated = await usersApi.updateCurrentUser({ telegram_notifications_enabled: e.target.checked })
                            setCurrentUser(updated)
                          } catch { setTelegramMessage(t('telegramErrorSaving')) }
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm text-foreground">{t('telegramEnableNotifications')}</span>
                    </label>

                    <button
                      onClick={async () => {
                        setTelegramSaving(true)
                        setTelegramMessage(null)
                        try {
                          const updated = await usersApi.updateCurrentUser({ telegram_bot_token: '' })
                          setCurrentUser(updated)
                          setTelegramToken('')
                          setTelegramMessage(t('telegramTokenRemoved'))
                        } catch { setTelegramMessage(t('telegramErrorSaving')) }
                        finally { setTelegramSaving(false) }
                      }}
                      disabled={telegramSaving}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      {t('telegramRemoveToken')}
                    </button>
                  </div>
                )}
              </div>
```

- [ ] **Step 2: Run lint and typecheck**

Run:
```bash
cd frontend && npm run lint && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Settings.tsx
git commit -m "feat: add telegram settings section"
```

---

## Task 11: Documentation — Update features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Add Telegram notifications entry**

In `docs/features.md`, in the "Уведомления и Real-time синхронизация" section, after the browser notifications subsection, add:

```markdown
**Telegram-оповещения для напоминаний ✅ (Реализовано 26.04.2026)**
- Дублирование напоминаний о задачах (due_reminder) в Telegram
- Каждый пользователь создаёт своего бота через @BotFather
- Токен бота вводится в Настройках → Общие → Telegram
- Валидация токена через Telegram API (getMe)
- Привязка chat_id: пользователь пишет /start боту → scheduler job захватывает chat_id
- Polling-архитектура: scheduler job опрашивает все неподключённые боты каждые 5 сек
- Формат сообщения: заголовок задачи + дедлайн в timezone пользователя
- Переключатель вкл/выкл Telegram-уведомлений в настройках
- Приветственное сообщение при успешной привязке
- Кнопка «Удалить токен» для отключения бота
- Обработка ошибок: невалидный токен, заблокированный бот, сеть недоступна
- Новые поля в модели User: telegram_bot_token, telegram_chat_id, telegram_notifications_enabled
- API: POST /api/users/telegram/validate-token
- Сервис: `backend/app/services/telegram_notifier.py`
- Файлы: `backend/app/services/telegram_notifier.py`, `backend/app/models/user.py`, `backend/app/schemas/user.py`, `backend/app/api/users.py`, `backend/app/scheduler.py`, `frontend/src/routes/Settings.tsx`, `frontend/src/api/users.ts`
```

- [ ] **Step 2: Commit**

```bash
git add docs/features.md
git commit -m "docs: add telegram notifications to features.md"
```

---

## Task 12: Final verification

- [ ] **Step 1: Run backend linter**

```bash
cd backend && ruff check app/
```

- [ ] **Step 2: Run frontend lint + typecheck**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

- [ ] **Step 3: Run backend tests**

```bash
cd backend && pytest tests/ -v
```
