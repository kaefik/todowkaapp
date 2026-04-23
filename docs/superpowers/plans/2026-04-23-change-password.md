# Смена пароля пользователя — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить возможность смены пароля с подтверждением текущим паролем, с инвалидацией других сессий.

**Architecture:** Новый POST /api/auth/change-password на бэкенде. Поле password_changed_at в модели User для инвалидации refresh-токенов старых сессий. На фронте — новая вкладка «Безопасность» в Settings с формой из 3 полей.

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy 2.0 async, React, TypeScript, Zod, Tailwind CSS

---

### Task 1: Добавить поле password_changed_at в модель User

**Files:**
- Modify: `backend/app/models/user.py:20-21`

- [ ] **Step 1: Добавить колонку password_changed_at**

В `backend/app/models/user.py` после строки с `locked_until` (строка 21) добавить:

```python
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

- [ ] **Step 2: Создать Alembic миграцию**

Run: `cd backend && alembic revision --autogenerate -m "add_password_changed_at_to_users"`

Expected: файл миграции создан в `backend/alembic/versions/`

- [ ] **Step 3: Применить миграцию**

Run: `cd backend && alembic upgrade head`

Expected: `Running upgrade ... -> ...add_password_changed_at...done`

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/user.py backend/alembic/versions/
git commit -m "feat: add password_changed_at column to User model"
```

---

### Task 2: Добавить iat в refresh-токен

**Files:**
- Modify: `backend/app/security.py:38-47`

- [ ] **Step 1: Добавить iat в create_refresh_token**

В `backend/app/security.py` в функции `create_refresh_token` (строка 45), заменить:

```python
    to_encode.update({"exp": expire, "type": "refresh", "jti": jti})
```

на:

```python
    now = datetime.now(UTC)
    to_encode.update({"exp": expire, "iat": now, "type": "refresh", "jti": jti})
```

- [ ] **Step 2: Проверить что тесты проходят**

Run: `cd backend && python -m pytest tests/test_auth.py -v`

Expected: все тесты PASS

- [ ] **Step 3: Commit**

```bash
git add backend/app/security.py
git commit -m "feat: add iat claim to refresh tokens"
```

---

### Task 3: Добавить Pydantic-схему ChangePasswordRequest

**Files:**
- Modify: `backend/app/schemas/auth.py`

- [ ] **Step 1: Добавить схему в конец файла**

В `backend/app/schemas/auth.py` после класса `TokenResponse` добавить:

```python
class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=100)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not _has_uppercase(v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not _has_special(v):
            raise ValueError('Password must contain at least one special character')
        return v
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/auth.py
git commit -m "feat: add ChangePasswordRequest schema"
```

---

### Task 4: Написать тесты для смены пароля

**Files:**
- Create: `backend/tests/test_change_password.py`

- [ ] **Step 1: Написать тесты**

Создать файл `backend/tests/test_change_password.py`:

```python
import pytest
from sqlalchemy import select

from app.models.user import User
from app.security import verify_password


@pytest.fixture
async def authed_user(client, db_session):
    await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "OldPass123!",
        },
    )
    login_resp = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "OldPass123!"},
    )
    return {
        "access_token": login_resp.cookies.get("access_token"),
        "refresh_token": login_resp.cookies.get("refresh_token"),
    }


@pytest.mark.asyncio
async def test_change_password_success(client, db_session, authed_user):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Пароль успешно изменён"

    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies

    result = await db_session.execute(select(User).where(User.username == "testuser"))
    user = result.scalar_one()
    assert verify_password("NewPass456!", user.password_hash)
    assert user.password_changed_at is not None


@pytest.mark.asyncio
async def test_change_password_wrong_current(client, db_session, authed_user):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "WrongPass123!", "new_password": "NewPass456!"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert response.status_code == 400
    assert "Неверный текущий пароль" in response.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_same_password(client, db_session, authed_user):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "OldPass123!"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert response.status_code == 400
    assert "совпадает" in response.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_weak_new(client, db_session, authed_user):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "weak"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_change_password_requires_auth(client, db_session):
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_change_password_old_refresh_revoked(client, db_session, authed_user):
    old_refresh = authed_user["refresh_token"]

    change_resp = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert change_resp.status_code == 200

    refresh_resp = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": old_refresh},
    )
    assert refresh_resp.status_code == 401


@pytest.mark.asyncio
async def test_change_password_new_refresh_works(client, db_session, authed_user):
    change_resp = await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
        cookies={"access_token": authed_user["access_token"]},
    )
    assert change_resp.status_code == 200

    new_refresh = change_resp.cookies.get("refresh_token")
    new_access = change_resp.cookies.get("access_token")

    refresh_resp = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": new_refresh},
    )
    assert refresh_resp.status_code == 200

    me_resp = await client.get(
        "/api/auth/me",
        cookies={"access_token": new_access},
    )
    assert me_resp.status_code == 200


@pytest.mark.asyncio
async def test_login_with_new_password_after_change(client, db_session, authed_user):
    await client.post(
        "/api/auth/change-password",
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
        cookies={"access_token": authed_user["access_token"]},
    )

    login_resp = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "NewPass456!"},
    )
    assert login_resp.status_code == 200

    old_login = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "OldPass123!"},
    )
    assert old_login.status_code == 401
```

- [ ] **Step 2: Запустить тесты, убедиться что они падают**

Run: `cd backend && python -m pytest tests/test_change_password.py -v`

Expected: FAIL — endpoint не существует (404/405)

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_change_password.py
git commit -m "test: add change-password endpoint tests"
```

---

### Task 5: Реализовать эндпоинт POST /api/auth/change-password

**Files:**
- Modify: `backend/app/api/auth.py`

- [ ] **Step 1: Добавить импорт ChangePasswordRequest**

В `backend/app/api/auth.py` строка 16, заменить:

```python
from app.schemas.user import LoginRequest, RegisterRequest, TokenResponse, UserResponse
```

на:

```python
from app.schemas.auth import ChangePasswordRequest
from app.schemas.user import LoginRequest, RegisterRequest, TokenResponse, UserResponse
```

- [ ] **Step 2: Добавить эндпоинт после /me (строка 242)**

Добавить в конец файла перед существующим `@auth_router.get("/me"...)`:

```python
@auth_router.post("/change-password")
async def change_password(
    response: Response,
    data: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> dict[str, str]:
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль",
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новый пароль совпадает с текущим",
        )

    current_user.password_hash = hash_password(data.new_password)
    current_user.password_changed_at = datetime.now(UTC)
    await db.commit()

    if refresh_token:
        token_jti = get_token_jti(refresh_token)
        if token_jti:
            revoked = RevokedToken(token_jti=token_jti)
            db.add(revoked)
            await db.commit()

    new_access = create_access_token(data={"sub": str(current_user.id)})
    new_refresh = create_refresh_token(data={"sub": str(current_user.id)})

    set_access_cookie(response, new_access)
    set_refresh_cookie(response, new_refresh)

    return {"message": "Пароль успешно изменён"}
```

- [ ] **Step 3: Запустить тесты**

Run: `cd backend && python -m pytest tests/test_change_password.py -v`

Expected: все 9 тестов PASS

- [ ] **Step 4: Запустить все тесты**

Run: `cd backend && python -m pytest tests/ -v`

Expected: все тесты PASS

- [ ] **Step 5: Ruff check**

Run: `cd backend && ruff check app/api/auth.py app/schemas/auth.py app/security.py app/models/user.py`

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/auth.py
git commit -m "feat: add POST /api/auth/change-password endpoint"
```

---

### Task 6: Добавить проверку password_changed_at в refresh

**Files:**
- Modify: `backend/app/api/auth.py` (функция `refresh`, строки 150-219)

- [ ] **Step 1: Добавить проверку после загрузки пользователя**

В функции `refresh` в `backend/app/api/auth.py`, после блока проверки `user is None or not user.is_active` (после строки 206), добавить:

```python
    if user.password_changed_at is not None:
        token_iat = payload.get("iat")
        if token_iat is not None:
            from datetime import datetime as _dt
            iat_dt = _dt.fromtimestamp(token_iat, tz=UTC)
            if iat_dt < user.password_changed_at:
                revoked_token = RevokedToken(token_jti=token_jti)
                db.add(revoked_token)
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token has been revoked",
                )
```

- [ ] **Step 2: Запустить тесты**

Run: `cd backend && python -m pytest tests/test_change_password.py tests/test_auth.py -v`

Expected: все тесты PASS

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/auth.py
git commit -m "feat: invalidate refresh tokens issued before password change"
```

---

### Task 7: Добавить API-метод на фронтенде

**Files:**
- Modify: `frontend/src/api/users.ts`

- [ ] **Step 1: Добавить метод changePassword**

В `frontend/src/api/users.ts` после метода `deleteUser` добавить:

```typescript
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await httpClient.post<{ message: string }>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    return response.data
  },
```

- [ ] **Step 2: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors related to users.ts

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/users.ts
git commit -m "feat: add changePassword API method"
```

---

### Task 8: Добавить вкладку «Безопасность» в Settings

**Files:**
- Modify: `frontend/src/routes/Settings.tsx`

- [ ] **Step 1: Обновить тип Tab**

В `frontend/src/routes/Settings.tsx` строка 10, заменить:

```typescript
type Tab = 'general' | 'profile' | 'users'
```

на:

```typescript
type Tab = 'general' | 'profile' | 'security' | 'users'
```

- [ ] **Step 2: Добавить вкладку security в массив tabs**

В строке 93-97, заменить массив tabs:

```typescript
  const tabs: { key: Tab; label: string; adminOnly: boolean }[] = [
    { key: 'general', label: 'Общие', adminOnly: false },
    { key: 'profile', label: 'Профиль', adminOnly: false },
    { key: 'security', label: 'Безопасность', adminOnly: false },
    { key: 'users', label: 'Пользователи', adminOnly: true },
  ]
```

- [ ] **Step 3: Добавить SecurityTab компонент**

Перед `function UsersTab` (строка 419) добавить:

```typescript
function SecurityTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = (): string | null => {
    if (!currentPassword) return 'Введите текущий пароль'
    if (!newPassword) return 'Введите новый пароль'
    if (newPassword.length < 8) return 'Пароль должен содержать минимум 8 символов'
    if (!/\d/.test(newPassword)) return 'Пароль должен содержать хотя бы одну цифру'
    if (!/\p{Lu}/u.test(newPassword)) return 'Пароль должен содержать хотя бы одну заглавную букву'
    if (!/[^\p{L}\p{N}]/u.test(newPassword)) return 'Пароль должен содержать хотя бы один спецсимвол'
    if (newPassword !== confirmPassword) return 'Пароли не совпадают'
    if (currentPassword === newPassword) return 'Новый пароль совпадает с текущим'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await usersApi.changePassword(currentPassword, newPassword)
      addToast({ title: 'Пароль изменён', body: 'Ваш пароль успешно обновлён', type: 'success' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      if (err instanceof Error && 'status' in err) {
        const apiErr = err as { status: number; message: string }
        if (apiErr.status === 400) {
          setError(apiErr.message || 'Неверный текущий пароль')
        } else if (apiErr.status === 422) {
          setError('Новый пароль не соответствует требованиям')
        } else {
          setError(apiErr.message || 'Ошибка при смене пароля')
        }
      } else {
        setError('Ошибка при смене пароля')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Смена пароля</h2>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Текущий пароль
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Новый пароль
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
            minLength={8}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Минимум 8 символов, хотя бы одна цифра, одна заглавная буква и один спецсимвол
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Подтвердите новый пароль
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-sm font-medium rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Сохранение...' : 'Изменить пароль'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Добавить рендер вкладки security**

Перед строкой `{activeTab === 'users' && user?.is_admin && <UsersTab currentUser={user} />}` (строка 414) добавить:

```typescript
      {activeTab === 'security' && <SecurityTab />}
```

- [ ] **Step 5: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

- [ ] **Step 6: Проверить линтер**

Run: `cd frontend && npm run lint 2>&1 | tail -5`

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/routes/Settings.tsx
git commit -m "feat: add Security tab with change password form"
```

---

### Task 9: Обновить документацию

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Добавить запись о смене пароля**

В `docs/features.md` в секции «Аутентификация и авторизация» (после строки 26 с timezone setup) добавить:

```markdown
- Смена пароля пользователем в настройках аккаунта
  - Вкладка «Безопасность» в настройках с формой смены пароля
  - Требуется ввод текущего пароля для подтверждения
  - Валидация нового пароля: минимум 8 символов, цифра, заглавная буква, спецсимвол
  - Проверка совпадения нового пароля с текущим
  - Инвалидация всех сессий кроме текущей после смены пароля
  - Автоматическая ре-аутентификация текущей сессии (новые access+refresh cookies)
  - Поле password_changed_at в модели User для отслеживания времени смены пароля
  - Refresh-токены, выпущенные до смены пароля, автоматически отзываются
  - API: POST /api/auth/change-password
  - Файлы: `backend/app/api/auth.py`, `backend/app/schemas/auth.py`, `backend/app/models/user.py`, `frontend/src/routes/Settings.tsx`, `frontend/src/api/users.ts`
```

В секции «Безопасность» (после строки 487 с логированием user_id) добавить:

```markdown
- Смена пароля с подтверждением текущим паролем
  - POST /api/auth/change-password требует аутентификации и текущий пароль
  - Инвалидация сессий на других устройствах через password_changed_at + iat проверку в refresh-токене
  - Валидация нового пароля: те же правила что при регистрации
```

- [ ] **Step 2: Commit**

```bash
git add docs/features.md
git commit -m "docs: document change password feature"
```

---

### Task 10: Финальная проверка

- [ ] **Step 1: Запустить все бэкенд-тесты**

Run: `cd backend && python -m pytest tests/ -v`

Expected: все тесты PASS

- [ ] **Step 2: Ruff check бэкенда**

Run: `cd backend && ruff check .`

Expected: no errors

- [ ] **Step 3: TypeScript check фронтенда**

Run: `cd frontend && npx tsc --noEmit`

Expected: no errors

- [ ] **Step 4: ESLint check фронтенда**

Run: `cd frontend && npm run lint`

Expected: no errors
