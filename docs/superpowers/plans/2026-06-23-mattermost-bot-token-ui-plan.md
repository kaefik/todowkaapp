# Mattermost Bot Token в UI — План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to configure Mattermost bot token via UI instead of only .env file.

**Architecture:** Add Mattermost bot settings to `system_settings` table (like SMTP). Admin-only API endpoints and UI section. MattermostNotifierService reads from DB first, falls back to .env.

**Tech Stack:** Python/FastAPI (backend), React/TypeScript (frontend), SQLAlchemy (DB)

---

### Task 1: Add Mattermost Settings API Endpoints

**Files:**
- Modify: `backend/app/api/settings.py`
- Test: `backend/tests/test_mattermost_settings_api.py`

- [ ] **Step 1: Add Pydantic schemas for Mattermost settings**

Add after SMTPConfigResponse class:

```python
class MattermostConfig(BaseModel):
    mattermost_url: str | None = None
    mattermost_bot_token: str | None = None


class MattermostConfigResponse(BaseModel):
    mattermost_url: str | None = None
    mattermost_bot_token_configured: bool = False
```

- [ ] **Step 2: Add helper function to get Mattermost config from DB**

Add after get_smtp_config_from_db function:

```python
async def get_mattermost_config_from_db(db: AsyncSession) -> dict:
    from sqlalchemy import text
    result = await db.execute(text(
        "SELECT key, value FROM system_settings WHERE key LIKE 'mattermost_%'"
    ))
    rows = result.fetchall()
    config = {
        'mattermost_url': None,
        'mattermost_bot_token_configured': False,
    }
    for row in rows:
        if row[0] == 'mattermost_url':
            config['mattermost_url'] = row[1]
        elif row[0] == 'mattermost_bot_token' and row[1]:
            config['mattermost_bot_token_configured'] = True
    return config


async def get_mattermost_bot_token_from_db(db: AsyncSession) -> str | None:
    from sqlalchemy import text
    result = await db.execute(text(
        "SELECT value FROM system_settings WHERE key = 'mattermost_bot_token'"
    ))
    row = result.fetchone()
    if row and row[0]:
        from app.services.crypto_service import decrypt_secret
        return decrypt_secret(row[0])
    return None
```

- [ ] **Step 3: Add GET /api/settings/mattermost endpoint**

Add after PUT /smtp endpoint:

```python
@settings_router.get("/mattermost", response_model=MattermostConfigResponse)
async def get_mattermost_settings(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_admin_user)],
) -> MattermostConfigResponse:
    config = await get_mattermost_config_from_db(db)
    return MattermostConfigResponse(**config)
```

- [ ] **Step 4: Add PUT /api/settings/mattermost endpoint**

```python
@settings_router.put("/mattermost", response_model=MattermostConfigResponse)
async def update_mattermost_settings(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_admin_user)],
    config: MattermostConfig,
) -> MattermostConfigResponse:
    from sqlalchemy import text

    now = datetime.now(ZoneInfo('UTC'))

    settings_to_save = [
        ('mattermost_url', config.mattermost_url),
        ('mattermost_bot_token', encrypt_secret(config.mattermost_bot_token) if config.mattermost_bot_token else None),
    ]

    for key, value in settings_to_save:
        if value is not None:
            await db.execute(text("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (:key, :value, :updated_at)
                ON CONFLICT(key) DO UPDATE SET value = :value, updated_at = :updated_at
            """), {'key': key, 'value': value, 'updated_at': now})

    await db.commit()

    result = await get_mattermost_config_from_db(db)
    return MattermostConfigResponse(**result)
```

- [ ] **Step 5: Write tests**

Create `backend/tests/test_mattermost_settings_api.py`:

```python
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_mattermost_settings_get_endpoint_exists():
    """Mattermost settings GET endpoint exists"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/settings/mattermost")
        assert resp.status_code != 404


@pytest.mark.asyncio
async def test_mattermost_settings_put_endpoint_exists():
    """Mattermost settings PUT endpoint exists"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.put("/api/settings/mattermost", json={
            "mattermost_url": "http://localhost:8065",
            "mattermost_bot_token": "test-token"
        })
        assert resp.status_code != 404
```

- [ ] **Step 6: Run tests**

Run: `cd backend && pytest tests/test_mattermost_settings_api.py -v`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/settings.py backend/tests/test_mattermost_settings_api.py
git commit -m "feat: add Mattermost bot settings API endpoints"
```

---

### Task 2: Update MattermostNotifierService to Read from DB

**Files:**
- Modify: `backend/app/services/mattermost_notifier.py`

- [ ] **Step 1: Add helper function to get Mattermost config from DB**

Add at the top of the file, after imports:

```python
async def get_mattermost_config_from_db():
    """Get Mattermost config from system_settings table"""
    from sqlalchemy import text
    from app.database import async_session_factory

    async with async_session_factory() as db:
        result = await db.execute(text(
            "SELECT key, value FROM system_settings WHERE key LIKE 'mattermost_%'"
        ))
        rows = result.fetchall()
        config = {
            'mattermost_url': None,
            'mattermost_bot_token': None,
        }
        for row in rows:
            if row[0] == 'mattermost_url':
                config['mattermost_url'] = row[1]
            elif row[0] == 'mattermost_bot_token' and row[1]:
                from app.services.crypto_service import decrypt_secret
                config['mattermost_bot_token'] = decrypt_secret(row[1])
        return config
```

- [ ] **Step 2: Update send_reminder to use DB config**

Replace the send_reminder method:

```python
    @staticmethod
    async def send_reminder(user: 'User', task: 'Task') -> bool:
        if not user.mattermost_notifications_enabled or not user.mattermost_user_id:
            return False

        from app.config import settings

        # Get config from DB first, fallback to .env
        db_config = await get_mattermost_config_from_db()

        if user.mattermost_bind_mode == 'bot':
            token = db_config.get('mattermost_bot_token') or settings.mattermost_bot_token
            if not token:
                logger.warning(f"No Mattermost bot token configured for bot mode user {user.id}")
                return False
            mattermost_url = db_config.get('mattermost_url') or settings.mattermost_url
        else:
            token = user.decrypted_mattermost_bot_token
            if not token:
                return False
            mattermost_url = user.mattermost_url or db_config.get('mattermost_url') or settings.mattermost_url

        if not mattermost_url:
            logger.warning(f"No Mattermost URL configured for user {user.id}")
            return False

        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
        lang = getattr(user, 'language', None) or "ru"

        text = MattermostNotifierService.format_full_task_info(task, user_tz, frontend_url=settings.frontend_url, lang=lang)

        adapter = MattermostBotAdapter(mattermost_url, token)

        dm_channel_id = await adapter.get_or_create_dm_channel(user.mattermost_user_id)
        if not dm_channel_id:
            logger.warning(f"Failed to get DM channel for user {user.id}")
            return False

        result = await adapter.send_message(dm_channel_id, text)

        if not result:
            logger.warning(f"Failed to send Mattermost reminder to user {user.id}")
            return False

        return True
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/mattermost_notifier.py
git commit -m "feat: update MattermostNotifierService to read config from DB"
```

---

### Task 3: Add Frontend API Functions

**Files:**
- Modify: `frontend/src/api/users.ts`

- [ ] **Step 1: Add Mattermost settings API functions**

Add after SMTP settings functions:

```typescript
getMattermostSettings: async (): Promise<{ mattermost_url: string | null; mattermost_bot_token_configured: boolean }> => {
  const resp = await httpClient.get<{ mattermost_url: string | null; mattermost_bot_token_configured: boolean }>('/settings/mattermost')
  return resp.data
},

updateMattermostSettings: async (data: { mattermost_url: string | null; mattermost_bot_token: string | null }): Promise<{ mattermost_url: string | null; mattermost_bot_token_configured: boolean }> => {
  const resp = await httpClient.put<{ mattermost_url: string | null; mattermost_bot_token_configured: boolean }>('/settings/mattermost', data)
  return resp.data
},
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/users.ts
git commit -m "feat: add Mattermost settings API functions"
```

---

### Task 4: Create MattermostBotSettings Component

**Files:**
- Create: `frontend/src/components/MattermostBotSettings.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../api/users';

export default function MattermostBotSettings() {
  const { t } = useTranslation('settings');
  const [settings, setSettings] = useState<{ mattermost_url: string | null; mattermost_bot_token_configured: boolean } | null>(null);
  const [formData, setFormData] = useState({ mattermost_url: '', mattermost_bot_token: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; username?: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await usersApi.getMattermostSettings();
      setSettings(data);
      if (data.mattermost_url) {
        setFormData({ mattermost_url: data.mattermost_url, mattermost_bot_token: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const resp = await fetch(`${formData.mattermost_url}/api/v4/users/me`, {
        headers: { 'Authorization': `Bearer ${formData.mattermost_bot_token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setValidationResult({ valid: true, username: data.username });
      } else {
        setValidationResult({ valid: false });
      }
    } catch {
      setValidationResult({ valid: false });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const result = await usersApi.updateMattermostSettings({
        mattermost_url: formData.mattermost_url || null,
        mattermost_bot_token: formData.mattermost_bot_token || null,
      });
      setSettings(result);
      setSaved(true);
      setFormData({ ...formData, mattermost_bot_token: '' });
      setValidationResult(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorSaving'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('mattermostBotSettings', { defaultValue: 'Mattermost Bot' })}
      </h2>
      <div className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('mattermostUrl')}
          </label>
          <input
            type="url"
            value={formData.mattermost_url}
            onChange={(e) => setFormData({ ...formData, mattermost_url: e.target.value })}
            placeholder="http://your-server:8065"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('mattermostBotToken', { defaultValue: 'Bot Token' })}
          </label>
          <input
            type="password"
            value={formData.mattermost_bot_token}
            onChange={(e) => setFormData({ ...formData, mattermost_bot_token: e.target.value })}
            placeholder={settings?.mattermost_bot_token_configured ? '******' : ''}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('mattermostBotTokenHint', { defaultValue: 'Создайте бота: Mattermost → Integrations → Bot Accounts → Add Bot Account' })}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            disabled={isValidating || !formData.mattermost_bot_token || !formData.mattermost_url}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
          >
            {isValidating ? t('common.loading', { defaultValue: 'Загрузка...' }) : t('settings.validate', { defaultValue: 'Проверить' })}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? t('saving', { defaultValue: 'Сохранение...' }) : t('saveChanges')}
          </button>
        </div>

        {validationResult && (
          <div className={`p-2 rounded ${validationResult.valid ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
            {validationResult.valid
              ? `${t('settings.connected', { defaultValue: 'Подключён' })} @${validationResult.username}`
              : t('settings.invalidToken', { defaultValue: 'Невалидный токен' })}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-600 dark:text-green-400">{t('smtpSaved', { defaultValue: 'Сохранено' })}</p>}

        {settings && (
          <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
            {settings.mattermost_bot_token_configured
              ? <span className="text-green-600 dark:text-green-400">{t('mattermostBotConfigured', { defaultValue: 'Бот настроен' })}</span>
              : <span>{t('mattermostBotNotConfigured', { defaultValue: 'Бот не настроен' })}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/MattermostBotSettings.tsx
git commit -m "feat: create MattermostBotSettings component"
```

---

### Task 5: Add MattermostBotSettings to Settings Page

**Files:**
- Modify: `frontend/src/routes/Settings.tsx`

- [ ] **Step 1: Import MattermostBotSettings**

Add after MattermostSettings import:

```typescript
import MattermostBotSettings from '../components/MattermostBotSettings'
```

- [ ] **Step 2: Add MattermostBotSettings to admin section**

Find the SMTPSettingsSection usage (around line 967) and add MattermostBotSettings after it:

```tsx
{activeTab === 'users' && user?.is_admin && <SMTPSettingsSection />}
{activeTab === 'users' && user?.is_admin && <MattermostBotSettings />}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Settings.tsx
git commit -m "feat: add MattermostBotSettings to admin settings"
```

---

### Task 6: Update i18n Keys

**Files:**
- Modify: `frontend/src/i18n/locales/ru/settings.json`
- Modify: `frontend/src/i18n/locales/en/settings.json`

- [ ] **Step 1: Add Russian i18n keys**

Add to `frontend/src/i18n/locales/ru/settings.json`:

```json
  "mattermostBotSettings": "Mattermost Bot",
  "mattermostBotToken": "Токен бота",
  "mattermostBotTokenHint": "Создайте бота: Mattermost → Integrations → Bot Accounts → Add Bot Account",
  "mattermostBotConfigured": "Бот настроен",
  "mattermostBotNotConfigured": "Бот не настроен",
```

- [ ] **Step 2: Add English i18n keys**

Add to `frontend/src/i18n/locales/en/settings.json`:

```json
  "mattermostBotSettings": "Mattermost Bot",
  "mattermostBotToken": "Bot Token",
  "mattermostBotTokenHint": "Create bot: Mattermost → Integrations → Bot Accounts → Add Bot Account",
  "mattermostBotConfigured": "Bot configured",
  "mattermostBotNotConfigured": "Bot not configured",
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/i18n/locales/ru/settings.json frontend/src/i18n/locales/en/settings.json
git commit -m "feat: add i18n keys for Mattermost bot settings"
```

---

### Task 7: Run All Checks

**Files:**
- All modified files

- [ ] **Step 1: Run backend linting**

Run: `cd backend && ruff check .`
Expected: No errors

- [ ] **Step 2: Run backend tests**

Run: `cd backend && pytest tests/test_mattermost*.py -v`
Expected: All tests pass

- [ ] **Step 3: Run frontend linting**

Run: `cd frontend && npm run lint`
Expected: No errors (from our changes)

- [ ] **Step 4: Run frontend type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: address linting and type check issues"
```
