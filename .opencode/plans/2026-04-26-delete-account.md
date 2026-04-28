# Delete Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the ability for users to completely delete their account and all associated data, with password verification and multi-step confirmation.

**Architecture:** Single backend endpoint `DELETE /api/auth/delete-account` with password verification and cascade delete. Frontend: 3-step modal component (`DeleteAccountModal`) in the Security tab of Settings. Uses existing cascade delete-orphan relationships on the User model.

**Tech Stack:** FastAPI (backend), Pydantic (validation), React + TypeScript + Zustand + Tailwind CSS (frontend), i18next (translations)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `backend/app/schemas/auth.py` | Add `DeleteAccountRequest` schema |
| Modify | `backend/app/api/auth.py` | Add `delete_account` endpoint |
| Create | `backend/tests/test_delete_account.py` | Tests for delete account endpoint |
| Modify | `frontend/src/api/users.ts` | Add `deleteAccount` API method |
| Modify | `frontend/src/stores/authStore.ts` | Add `deleteAccount` method |
| Create | `frontend/src/components/DeleteAccountModal.tsx` | 3-step confirmation modal |
| Modify | `frontend/src/routes/Settings.tsx` | Add delete account button to SecurityTab |
| Modify | `frontend/src/i18n/locales/ru/settings.json` | Russian translations |
| Modify | `frontend/src/i18n/locales/en/settings.json` | English translations |
| Modify | `docs/features.md` | Document new feature |

---

### Task 1: Backend — Add DeleteAccountRequest schema

**Files:**
- Modify: `backend/app/schemas/auth.py`

- [ ] **Step 1: Add schema to auth.py**

Add at the end of `backend/app/schemas/auth.py` (after line 81):

```python
class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python -c "from app.schemas.auth import DeleteAccountRequest; print('OK')"`
Expected: `OK`

---

### Task 2: Backend — Add delete_account endpoint

**Files:**
- Modify: `backend/app/api/auth.py`

- [ ] **Step 1: Add import of DeleteAccountRequest**

In `backend/app/api/auth.py`, change the import on line 16 from:

```python
from app.schemas.auth import ChangePasswordRequest
```

to:

```python
from app.schemas.auth import ChangePasswordRequest, DeleteAccountRequest
```

- [ ] **Step 2: Add the endpoint**

Add the following function after the `me` endpoint (after line 323) in `backend/app/api/auth.py`:

```python
@auth_router.delete("/delete-account")
async def delete_account(
    response: Response,
    data: DeleteAccountRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> dict[str, str]:
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный пароль",
        )

    if refresh_token:
        token_jti = get_token_jti(refresh_token)
        if token_jti:
            revoked = RevokedToken(token_jti=token_jti)
            db.add(revoked)

    await db.delete(current_user)
    await db.commit()

    clear_refresh_cookie(response)
    clear_access_cookie(response)

    return {"message": "Аккаунт удалён"}
```

- [ ] **Step 3: Verify syntax**

Run: `cd backend && python -c "from app.api.auth import auth_router; print('OK')"`
Expected: `OK`

---

### Task 3: Backend — Write tests for delete account

**Files:**
- Create: `backend/tests/test_delete_account.py`

- [ ] **Step 1: Create test file**

Create `backend/tests/test_delete_account.py` with the following content:

```python
import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.user import User
from app.models.task import Task


@pytest_asyncio.fixture
async def authed_user_with_task(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPass123!",
        },
    )
    login_resp = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "TestPass123!"},
    )

    await client.post(
        "/api/tasks",
        json={"title": "My task"},
        cookies={"access_token": login_resp.cookies.get("access_token")},
    )

    return {
        "access_token": login_resp.cookies.get("access_token"),
        "refresh_token": login_resp.cookies.get("refresh_token"),
    }


@pytest.mark.asyncio
async def test_delete_account_success(client, db_session, authed_user_with_task):
    response = await client.delete(
        "/api/auth/delete-account",
        json={"password": "TestPass123!"},
        cookies={"access_token": authed_user_with_task["access_token"]},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Аккаунт удалён"

    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies

    result = await db_session.execute(select(User).where(User.username == "testuser"))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_account_cascades_tasks(client, db_session, authed_user_with_task):
    response = await client.delete(
        "/api/auth/delete-account",
        json={"password": "TestPass123!"},
        cookies={"access_token": authed_user_with_task["access_token"]},
    )
    assert response.status_code == 200

    result = await db_session.execute(select(Task))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_account_wrong_password(client, db_session, authed_user_with_task):
    response = await client.delete(
        "/api/auth/delete-account",
        json={"password": "WrongPass123!"},
        cookies={"access_token": authed_user_with_task["access_token"]},
    )
    assert response.status_code == 401
    assert "Неверный пароль" in response.json()["detail"]

    result = await db_session.execute(select(User).where(User.username == "testuser"))
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_delete_account_requires_auth(client, db_session):
    response = await client.delete(
        "/api/auth/delete-account",
        json={"password": "TestPass123!"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delete_account_empty_password(client, db_session, authed_user_with_task):
    response = await client.delete(
        "/api/auth/delete-account",
        json={"password": ""},
        cookies={"access_token": authed_user_with_task["access_token"]},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_delete_account_revokes_refresh_token(client, db_session, authed_user_with_task):
    old_refresh = authed_user_with_task["refresh_token"]

    response = await client.delete(
        "/api/auth/delete-account",
        json={"password": "TestPass123!"},
        cookies={"access_token": authed_user_with_task["access_token"]},
    )
    assert response.status_code == 200

    refresh_resp = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": old_refresh},
    )
    assert refresh_resp.status_code == 401
```

- [ ] **Step 2: Run tests**

Run: `cd backend && python -m pytest tests/test_delete_account.py -v`
Expected: All 6 tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/auth.py backend/app/api/auth.py backend/tests/test_delete_account.py
git commit -m "feat: add delete account endpoint with password verification"
```

---

### Task 4: Frontend — Add deleteAccount API method

**Files:**
- Modify: `frontend/src/api/users.ts`

- [ ] **Step 1: Add deleteAccount method**

Add the following method to the `usersApi` object in `frontend/src/api/users.ts` (after `changePassword` at line 45, before the closing `}`):

```typescript
  deleteAccount: async (password: string): Promise<{ message: string }> => {
    const response = await httpClient.request<{ message: string }>({
      method: 'DELETE',
      url: '/auth/delete-account',
      data: { password },
    })
    return response.data
  },
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors related to users.ts

---

### Task 5: Frontend — Add deleteAccount to authStore

**Files:**
- Modify: `frontend/src/stores/authStore.ts`

- [ ] **Step 1: Add deleteAccount to AuthState interface**

Add `deleteAccount` to the `AuthState` interface (after `setCurrentUser` at line 29):

```typescript
  deleteAccount: (password: string) => Promise<void>
```

- [ ] **Step 2: Add deleteAccount implementation**

Add the `deleteAccount` method inside the persist callback, after `setCurrentUser` (after line 286, before the closing `}`):

```typescript
  deleteAccount: async (password) => {
    const userId = useAuthStore.getState().user?.id
    const response = await fetch('/api/auth/delete-account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete account')
    }

    if (userId) {
      clearLocalData(userId).catch((err) => {
        if (import.meta.env.DEV) {
          console.error('[Auth] Failed to clear local data after account deletion:', err)
        }
      })
    }

    set({
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },
```

- [ ] **Step 3: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

---

### Task 6: Frontend — Add i18n translations

**Files:**
- Modify: `frontend/src/i18n/locales/ru/settings.json`
- Modify: `frontend/src/i18n/locales/en/settings.json`

- [ ] **Step 1: Add Russian translations**

Add the following keys at the end of `frontend/src/i18n/locales/ru/settings.json` (before the closing `}`, add a comma after the last existing key `"failedLoadStats"`):

```json
  "deleteAccount": "Удалить аккаунт",
  "deleteAccountDescription": "Удалить аккаунт и все связанные данные навсегда. Это действие нельзя отменить.",
  "deleteAccountBtn": "Удалить аккаунт",
  "deleteAccountStep1Title": "Удаление аккаунта",
  "deleteAccountStep1Text": "Для подтверждения введите пароль от вашего аккаунта.",
  "deleteAccountPassword": "Пароль",
  "deleteAccountContinue": "Продолжить",
  "deleteAccountCancel": "Отмена",
  "deleteAccountStep2Title": "Это действие нельзя отменить",
  "deleteAccountWillDelete": "Будут удалены без возможности восстановления:",
  "deleteAccountWillDeleteTasks": "Все задачи (включая подзадачи и повторения)",
  "deleteAccountWillDeleteProjects": "Все проекты",
  "deleteAccountWillDeleteAreas": "Все области ответственности",
  "deleteAccountWillDeleteContexts": "Все контексты",
  "deleteAccountWillDeleteTags": "Все теги",
  "deleteAccountWillDeleteNotifications": "Все уведомления",
  "deleteAccountWillDeleteVerbs": "Все шаблоны глаголов",
  "deleteAccountUnderstand": "Понимаю, продолжить",
  "deleteAccountBack": "Назад",
  "deleteAccountStep3Title": "Последний шаг",
  "deleteAccountStep3Text": "Введите УДАЛИТЬ для подтверждения",
  "deleteAccountStep3Placeholder": "Введите УДАЛИТЬ",
  "deleteAccountFinalBtn": "Удалить навсегда",
  "deleteAccountWrongPassword": "Неверный пароль",
  "deleteAccountError": "Ошибка при удалении аккаунта",
  "deleteAccountDeleted": "Аккаунт удалён"
```

- [ ] **Step 2: Add English translations**

Add the following keys at the end of `frontend/src/i18n/locales/en/settings.json` (before the closing `}`, add a comma after the last existing key `"failedLoadStats"`):

```json
  "deleteAccount": "Delete Account",
  "deleteAccountDescription": "Delete your account and all associated data permanently. This action cannot be undone.",
  "deleteAccountBtn": "Delete account",
  "deleteAccountStep1Title": "Delete Account",
  "deleteAccountStep1Text": "Enter your password to confirm.",
  "deleteAccountPassword": "Password",
  "deleteAccountContinue": "Continue",
  "deleteAccountCancel": "Cancel",
  "deleteAccountStep2Title": "This action cannot be undone",
  "deleteAccountWillDelete": "The following will be permanently deleted:",
  "deleteAccountWillDeleteTasks": "All tasks (including subtasks and recurrences)",
  "deleteAccountWillDeleteProjects": "All projects",
  "deleteAccountWillDeleteAreas": "All areas of responsibility",
  "deleteAccountWillDeleteContexts": "All contexts",
  "deleteAccountWillDeleteTags": "All tags",
  "deleteAccountWillDeleteNotifications": "All notifications",
  "deleteAccountWillDeleteVerbs": "All verb templates",
  "deleteAccountUnderstand": "I understand, continue",
  "deleteAccountBack": "Back",
  "deleteAccountStep3Title": "Final Step",
  "deleteAccountStep3Text": "Type DELETE to confirm",
  "deleteAccountStep3Placeholder": "Type DELETE",
  "deleteAccountFinalBtn": "Delete permanently",
  "deleteAccountWrongPassword": "Wrong password",
  "deleteAccountError": "Failed to delete account",
  "deleteAccountDeleted": "Account deleted"
```

- [ ] **Step 3: Verify JSON is valid**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/ru/settings.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/en/settings.json','utf8')); console.log('OK')"`
Expected: `OK`

---

### Task 7: Frontend — Create DeleteAccountModal component

**Files:**
- Create: `frontend/src/components/DeleteAccountModal.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/DeleteAccountModal.tsx` with the following content:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 1 | 2 | 3

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const { t } = useTranslation('settings')
  const navigate = useNavigate()
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const addToast = useToastStore((s) => s.addToast)

  const [step, setStep] = useState<Step>(1)
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleClose = () => {
    setStep(1)
    setPassword('')
    setConfirmText('')
    setError(null)
    setLoading(false)
    onClose()
  }

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setError(null)
    setStep(2)
  }

  const handleStep3 = async () => {
    setLoading(true)
    setError(null)
    try {
      await deleteAccount(password)
      addToast({ title: t('deleteAccountDeleted'), body: '', type: 'success' })
      handleClose()
      navigate('/login', { replace: true })
    } catch (err) {
      if (err instanceof Error && err.message === 'Неверный пароль') {
        setError(t('deleteAccountWrongPassword'))
        setStep(1)
        setPassword('')
      } else {
        setError(err instanceof Error ? err.message : t('deleteAccountError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const itemsWillBeDeleted = [
    t('deleteAccountWillDeleteTasks'),
    t('deleteAccountWillDeleteProjects'),
    t('deleteAccountWillDeleteAreas'),
    t('deleteAccountWillDeleteContexts'),
    t('deleteAccountWillDeleteTags'),
    t('deleteAccountWillDeleteNotifications'),
    t('deleteAccountWillDeleteVerbs'),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('deleteAccountStep1Title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('deleteAccountStep1Text')}
            </p>
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleStep1}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('deleteAccountPassword')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {t('deleteAccountCancel')}
                </button>
                <button
                  type="submit"
                  disabled={!password}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('deleteAccountContinue')}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
              {t('deleteAccountStep2Title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('deleteAccountWillDelete')}
            </p>
            <ul className="space-y-1 mb-4">
              {itemsWillBeDeleted.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('deleteAccountBack')}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                {t('deleteAccountUnderstand')}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('deleteAccountStep3Title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('deleteAccountStep3Text')}
            </p>
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={t('deleteAccountStep3Placeholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('deleteAccountBack')}
              </button>
              <button
                type="button"
                onClick={handleStep3}
                disabled={confirmText !== 'УДАЛИТЬ' || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : t('deleteAccountFinalBtn')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

Note: The confirm text check uses "УДАЛИТЬ" for both locales since the primary audience is Russian-speaking.

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

---

### Task 8: Frontend — Integrate DeleteAccountModal into SecurityTab

**Files:**
- Modify: `frontend/src/routes/Settings.tsx`

- [ ] **Step 1: Add import**

At the top of `frontend/src/routes/Settings.tsx`, add after line 9 (`import { VerbSettings } from '../components/VerbSettings'`):

```tsx
import { DeleteAccountModal } from '../components/DeleteAccountModal'
```

- [ ] **Step 2: Add state to SecurityTab**

In the `SecurityTab` function (starting at line 527), add state after line 537 (`const [showConfirm, setShowConfirm] = useState(false)`):

```tsx
  const [showDeleteModal, setShowDeleteModal] = useState(false)
```

- [ ] **Step 3: Wrap SecurityTab return in fragment and add danger zone**

The SecurityTab currently returns a single `<div>` card (lines 586-696). Wrap it in `<>...</>` and add the danger zone card after. The full return statement becomes:

Replace lines 586-696 (the return statement of SecurityTab) with:

```tsx
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('changePassword')}</h2>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ... existing password form fields unchanged ... */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('currentPassword')}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <button
                type="button"
                onMouseDown={() => setShowCurrent(true)}
                onMouseUp={() => setShowCurrent(false)}
                onMouseLeave={() => setShowCurrent(false)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('newPassword')}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                minLength={8}
              />
              <button
                type="button"
                onMouseDown={() => setShowNew(true)}
                onMouseUp={() => setShowNew(false)}
                onMouseLeave={() => setShowNew(false)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('passwordRequirements')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('confirmNewPassword')}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <button
                type="button"
                onMouseDown={() => setShowConfirm(true)}
                onMouseUp={() => setShowConfirm(false)}
                onMouseLeave={() => setShowConfirm(false)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-sm font-medium rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('saving') : t('changePasswordBtn')}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border border-red-200 dark:border-red-800">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">{t('deleteAccount')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('deleteAccountDescription')}</p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
        >
          {t('deleteAccountBtn')}
        </button>
        <DeleteAccountModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} />
      </div>
    </>
  )
```

- [ ] **Step 4: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

---

### Task 9: Update docs/features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Add feature to features.md**

Read `docs/features.md` and add the delete account feature to the appropriate section. Add an entry like:

```
- **Удаление аккаунта** — Полное удаление аккаунта и всех данных пользователя. Требует ввода пароля и тройного подтверждения. Находится в Настройки → Безопасность.
```

---

### Task 10: Final verification

- [ ] **Step 1: Run backend tests**

Run: `cd backend && python -m pytest tests/test_delete_account.py -v`
Expected: All 6 tests PASS

- [ ] **Step 2: Run frontend typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: No errors related to new files

- [ ] **Step 4: Commit all frontend changes**

```bash
git add frontend/src/api/users.ts frontend/src/stores/authStore.ts frontend/src/components/DeleteAccountModal.tsx frontend/src/routes/Settings.tsx frontend/src/i18n/locales/ru/settings.json frontend/src/i18n/locales/en/settings.json docs/features.md
git commit -m "feat: add delete account with 3-step confirmation UI"
```
