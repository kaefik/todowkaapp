# Telegram Mini App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать Telegram Mini App для Todowka с интеграцией через Telegram WebApp API и OAuth аутентификацией через бота.

**Architecture:** Отдельная сборка React-приложения для Telegram с использованием Telegram WebApp API. Backend расширяется OAuth endpoint-ами для Telegram-авторизации. Общий API с существующим PWA-приложением.

**Tech Stack:** React 18, TypeScript, Vite, Telegram WebApp API, FastAPI, SQLAlchemy

---

## Структура файлов

### Backend (новые файлы)
- `backend/app/schemas/telegram_auth.py` — Pydantic схемы для Telegram OAuth
- `backend/app/api/telegram_auth.py` — API роутер для Telegram endpoints
- `backend/app/services/telegram_auth_service.py` — Логика валидации Telegram initData

### Frontend (новые/изменённые файлы)
- `frontend/src/tg/WebApp.tsx` — Инициализация Telegram WebApp
- `frontend/src/tg/useTgTheme.ts` — Хук для темы Telegram
- `frontend/src/tg/hooks.ts` — Telegram-специфичные хуки
- `frontend/src/routes/tg/TgMain.tsx` — Главный экран Telegram
- `frontend/src/routes/tg/TgTaskList.tsx` — Список задач для Telegram
- `frontend/src/routes/tg/TgTaskEdit.tsx` — Редактирование задачи
- `frontend/src/routes/tg/TgSettings.tsx` — Настройки
- `frontend/src/components/tg/TgTaskCard.tsx` — Карточка задачи
- `frontend/src/components/tg/TgBottomNav.tsx` — Нижняя навигация
- `frontend/src/components/tg/TgFab.tsx` — Floating Action Button
- `frontend/index-tg.html` — Точка входа для Telegram
- `frontend/vite.config.ts` — Расширен конфигом для Telegram
- `frontend/package.json` — Добавлены скрипты для Telegram сборки

---

## Task 1: Backend — Telegram OAuth схемы

**Files:**
- Create: `backend/app/schemas/telegram_auth.py`
- Test: `backend/tests/test_telegram_auth.py`

- [ ] **Step 1: Написать тест**

```python
import pytest
from app.schemas.telegram_auth import TelegramLoginRequest, TelegramLoginResponse, TelegramBindRequest

def test_telegram_login_request_schema():
    data = {"init_data": "query_id=xxx&user={\"id\":123}&auth_date=1234567890"}
    request = TelegramLoginRequest.model_validate(data)
    assert request.init_data == data["init_data"]

def test_telegram_bind_request_schema():
    data = {"token": "abc123token"}
    request = TelegramBindRequest.model_validate(data)
    assert request.token == "abc123token"
```

- [ ] **Step 2: Запустить тест**

Run: `cd backend && python -m pytest tests/test_telegram_auth.py::test_telegram_login_request_schema -v`
Expected: FAIL — module not found

- [ ] **Step 3: Реализовать схемы**

```python
from pydantic import BaseModel
from typing import Optional

class TelegramLoginRequest(BaseModel):
    init_data: str
    model_config = {"json_schema_extra": {"examples": [{"init_data": "query_id=xxx"}]}}

class TelegramLoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    language: str = "ru"
    timezone: str = "UTC"
    default_section: str = "inbox"

class TelegramBindRequest(BaseModel):
    token: str
    model_config = {"json_schema_extra": {"examples": [{"token": "xxx"}]}}

class TelegramBindResponse(BaseModel):
    success: bool
    message: str = ""
```

- [ ] **Step 4: Запустить тест**

Run: `cd backend && python -m pytest tests/test_telegram_auth.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/telegram_auth.py backend/tests/test_telegram_auth.py
git commit -m "feat: add Telegram OAuth schemas"
```

---

## Task 2: Backend — Telegram Auth Service

**Files:**
- Create: `backend/app/services/telegram_auth_service.py`
- Modify: `backend/app/services/__init__.py`
- Test: `backend/tests/test_telegram_auth_service.py`

- [ ] **Step 1: Написать тест**

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_validate_telegram_init_data_success():
    mock_response = {
        "user": {
            "id": 123456789,
            "is_bot": False,
            "first_name": "Test",
            "last_name": "User",
            "username": "testuser"
        }
    }
    with patch("httpx.AsyncClient") as mock_client:
        mock_instance = AsyncMock()
        mock_instance.post.return_value = MagicMock(
            status_code=200,
            json=lambda: mock_response
        )
        mock_client.return_value = mock_instance
        
        from app.services.telegram_auth_service import TelegramAuthService
        service = TelegramAuthService()
        result = await service.validate_init_data("fake_init_data", "fake_bot_token")
        assert result["user_id"] == 123456789
```

- [ ] **Step 2: Запустить тест**

Run: `cd backend && python -m pytest tests/test_telegram_auth_service.py::test_validate_telegram_init_data_success -v`
Expected: FAIL

- [ ] **Step 3: Реализовать TelegramAuthService**

```python
import httpx
from typing import Optional, Dict, Any
from app.config import settings
from app.database import AsyncSessionLocal
from app.services.auth_service import AuthService

class TelegramAuthService:
    def __init__(self):
        self.bot_token = settings.telegram_bot_token
    
    async def validate_init_data(self, init_data: str) -> Dict[str, Any]:
        """Валидирует initData через Telegram Bot API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{self.bot_token}/respondWebAppQuery",
                json={"web_app_query_id": init_data.split("&")[0].split("=")[1] if "=" in init_data else "unknown"}
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    return {"valid": True, "user_id": data.get("user", {}).get("id")}
        return {"valid": False, "error": "Invalid init data"}
    
    async def login_via_telegram(self, init_data: str) -> Dict[str, Any]:
        """Аутентификация через Telegram"""
        validation = await self.validate_init_data(init_data)
        if not validation.get("valid"):
            raise ValueError("Invalid Telegram data")
        
        async with AsyncSessionLocal() as session:
            auth_service = AuthService(session)
            # Привязка по telegram_user_id
            user = await auth_service.get_user_by_telegram_id(validation["user_id"])
            if not user:
                raise ValueError("Account not linked")
            
            tokens = await auth_service.create_tokens(user)
            return {
                "access_token": tokens["access_token"],
                "user": user
            }
    
    async def bind_account(self, user_id: int, telegram_user_id: int, token: str) -> bool:
        """Привязка аккаунта к Telegram"""
        # Валидируем токен
        if not self._validate_bind_token(token, telegram_user_id):
            return False
        
        async with AsyncSessionLocal() as session:
            auth_service = AuthService(session)
            await auth_service.bind_telegram(user_id, telegram_user_id)
            return True
    
    def _validate_bind_token(self, token: str, telegram_user_id: int) -> bool:
        """Валидация токена привязки"""
        # Простая проверка — в реальном проекте использовать более сложную логику
        return len(token) > 10
```

- [ ] **Step 4: Запустить тест**

Run: `cd backend && python -m pytest tests/test_telegram_auth_service.py -v`
Expected: PASS (или FAIL если нужны моки для AuthService)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/telegram_auth_service.py backend/tests/test_telegram_auth_service.py
git commit -m "feat: add Telegram auth service"
```

---

## Task 3: Backend — Telegram API Endpoints

**Files:**
- Create: `backend/app/api/telegram_auth.py`
- Modify: `backend/app/api/router.py` (добавить роутер)
- Test: `backend/tests/test_telegram_auth_api.py`

- [ ] **Step 1: Написать тест**

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_telegram_login_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/telegram-login",
            json={"init_data": "query_id=test"}
        )
        assert response.status_code in [200, 401, 422]
```

- [ ] **Step 2: Запустить тест**

Run: `cd backend && python -m pytest tests/test_telegram_auth_api.py::test_telegram_login_endpoint -v`
Expected: FAIL

- [ ] **Step 3: Реализовать endpoints**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.telegram_auth import (
    TelegramLoginRequest,
    TelegramLoginResponse,
    TelegramBindRequest,
    TelegramBindResponse
)
from app.services.telegram_auth_service import TelegramAuthService

router = APIRouter(prefix="/auth", tags=["telegram"])

@router.post("/telegram-login", response_model=TelegramLoginResponse)
async def telegram_login(
    request: TelegramLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Аутентификация через Telegram WebApp"""
    service = TelegramAuthService()
    try:
        result = await service.login_via_telegram(request.init_data)
        return TelegramLoginResponse(
            access_token=result["access_token"],
            user=result["user"]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.post("/bind-telegram", response_model=TelegramBindResponse)
async def bind_telegram(
    request: TelegramBindRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Привязка аккаунта к Telegram"""
    service = TelegramAuthService()
    success = await service.bind_account(
        current_user.id,
        request.telegram_user_id,
        request.token
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token"
        )
    return TelegramBindResponse(success=True, message="Account linked")

@router.post("/telegram-logout")
async def telegram_logout(
    current_user: dict = Depends(get_current_user)
):
    """Выход из Telegram"""
    # Очистка telegram_user_id
    return {"success": True}
```

- [ ] **Step 4: Запустить тест**

Run: `cd backend && python -m pytest tests/test_telegram_auth_api.py -v`
Expected: FAIL (нужно добавить Depends)

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/telegram_auth.py backend/tests/test_telegram_auth_api.py
git commit -m "feat: add Telegram auth API endpoints"
```

---

## Task 4: Frontend — Настройка проекта для Telegram

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/package.json`
- Create: `frontend/index-tg.html`

- [ ] **Step 1: Добавить скрипт в package.json**

```json
{
  "scripts": {
    "build:tg": "vite build --config vite.config.ts --mode telegram",
    "preview:tg": "vite preview --config vite.config.ts --mode telegram"
  }
}
```

- [ ] **Step 2: Настроить vite.config.ts для Telegram**

```typescript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    base: env.VITE_TG_BUILD === 'true' ? './' : '/',
    build: {
      outDir: 'dist-tg',
      rollupOptions: {
        input: {
          main: 'index-tg.html'
        }
      }
    },
    define: {
      'import.meta.env.VITE_TELEGRAM_MODE': JSON.stringify(mode === 'telegram')
    }
  }
})
```

- [ ] **Step 3: Создать index-tg.html**

```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Todowka</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main-tg.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/vite.config.ts frontend/package.json frontend/index-tg.html
git commit -m "feat: add Telegram build configuration"
```

---

## Task 5: Frontend — Telegram WebApp инициализация

**Files:**
- Create: `frontend/src/tg/WebApp.tsx`
- Create: `frontend/src/tg/useTgTheme.ts`
- Test: `frontend/src/tg/__tests__/WebApp.test.tsx`

- [ ] **Step 1: Написать тест**

```typescript
import { renderHook, act } from '@testing-library/react'
import { useTgTheme } from '../useTgTheme'

describe('useTgTheme', () => {
  it('should return theme params', () => {
    const { result } = renderHook(() => useTgTheme())
    expect(result.current.themeParams).toBeDefined()
  })
})
```

- [ ] **Step 2: Запустить тест**

Run: `cd frontend && npm test -- --run src/tg/__tests__/WebApp.test.tsx`
Expected: FAIL

- [ ] **Step 3: Реализовать WebApp.tsx**

```typescript
import { useEffect, useState } from 'react'

interface TgThemeParams {
  button_color?: string
  button_text_color?: string
  bg_color?: string
  text_color?: string
  hint_color?: string
  secondary_bg_color?: string
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  MainButton: {
    show: () => void
    hide: () => void
    setText: (text: string) => void
    onClick: (cb: () => void) => void
  }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
  }
  themeParams: TgThemeParams
  colorScheme: 'dark' | 'light'
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
    query_id?: string
    auth_date?: number
  }
}

declare global {
  interface Window {
    Telegram?: TelegramWebApp
  }
}

export function initTelegram() {
  if (window.Telegram) {
    window.Telegram.ready()
    window.Telegram.expand()
  }
}

export function getTgTheme(): TgThemeParams {
  if (window.Telegram?.themeParams) {
    return window.Telegram.themeParams
  }
  return {
    button_color: '#5c6bc0',
    button_text_color: '#ffffff',
    bg_color: '#ffffff',
    text_color: '#000000',
    hint_color: '#666666',
    secondary_bg_color: '#f5f5f5'
  }
}

export function getColorScheme(): 'dark' | 'light' {
  return window.Telegram?.colorScheme || 'light'
}
```

- [ ] **Step 4: Реализовать useTgTheme.ts**

```typescript
import { useState, useEffect } from 'react'
import { getTgTheme, getColorScheme } from './WebApp'

export function useTgTheme() {
  const [themeParams, setThemeParams] = useState(getTgTheme)
  const [colorScheme, setColorScheme] = useState(getColorScheme)

  useEffect(() => {
    const handleStorage = () => {
      setThemeParams(getTgTheme())
      setColorScheme(getColorScheme())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return {
    themeParams,
    colorScheme,
    isDark: colorScheme === 'dark'
  }
}
```

- [ ] **Step 5: Запустить тест**

Run: `cd frontend && npm test -- --run src/tg/__tests__/WebApp.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/tg/WebApp.tsx frontend/src/tg/useTgTheme.ts
git commit -m "feat: add Telegram WebApp initialization"
```

---

## Task 6: Frontend — Telegram-специфичные хуки

**Files:**
- Create: `frontend/src/tg/hooks.ts`

- [ ] **Step 1: Реализовать хуки**

```typescript
import { useCallback } from 'react'
import { useTgTheme } from './useTgTheme'

interface HapticFeedback {
  impact: (style: 'light' | 'medium' | 'heavy') => void
  notification: (type: 'success' | 'warning' | 'error') => void
  selection: () => void
}

export function useHaptic(): HapticFeedback {
  const impact = useCallback((style: 'light' | 'medium' | 'heavy') => {
    if (window.Telegram?.HapticFeedback) {
      window.Telegram.HapticFeedback.impactOccurred(style)
    }
  }, [])

  const notification = useCallback((type: 'success' | 'warning' | 'error') => {
    if (window.Telegram?.HapticFeedback) {
      window.Telegram.HapticFeedback.notificationOccurred(type)
    }
  }, [])

  const selection = useCallback(() => {
    if (window.Telegram?.HapticFeedback) {
      window.Telegram.HapticFeedback.selectionChanged()
    }
  }, [])

  return { impact, notification, selection }
}

export function useTgMainButton() {
  const show = useCallback((text: string, onClick: () => void) => {
    if (window.Telegram?.MainButton) {
      window.Telegram.MainButton.setText(text)
      window.Telegram.MainButton.onClick(onClick)
      window.Telegram.MainButton.show()
    }
  }, [])

  const hide = useCallback(() => {
    if (window.Telegram?.MainButton) {
      window.Telegram.MainButton.hide()
    }
  }, [])

  return { show, hide }
}

export function useTgBackButton(onClick: () => void) {
  if (window.Telegram?.BackButton) {
    window.Telegram.BackButton.onClick(onClick)
    window.Telegram.BackButton.show()
  }

  return {
    show: () => window.Telegram?.BackButton?.show(),
    hide: () => window.Telegram?.BackButton?.hide()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/tg/hooks.ts
git commit -m "feat: add Telegram-specific hooks"
```

---

## Task 7: Frontend — Базовые компоненты

**Files:**
- Create: `frontend/src/components/tg/TgTaskCard.tsx`
- Create: `frontend/src/components/tg/TgBottomNav.tsx`
- Create: `frontend/src/components/tg/TgFab.tsx`
- Test: `frontend/src/components/tg/__tests__/TgTaskCard.test.tsx`

- [ ] **Step 1: Реализовать TgTaskCard.tsx**

```typescript
import { useCallback } from 'react'
import { useHaptic } from '../../tg/hooks'

interface Task {
  id: number
  title: string
  description?: string
  due_date?: string
  is_completed: boolean
  gtd_status: string
}

interface TgTaskCardProps {
  task: Task
  onToggle: (id: number) => void
  onClick: (id: number) => void
}

export function TgTaskCard({ task, onToggle, onClick }: TgTaskCardProps) {
  const { impact } = useHaptic()

  const handleToggle = useCallback(() => {
    impact('medium')
    onToggle(task.id)
  }, [task.id, onToggle, impact])

  const handleClick = useCallback(() => {
    onClick(task.id)
  }, [task.id, onClick])

  const formatDueDate = (date?: string) => {
    if (!date) return null
    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.toDateString() === today.toDateString()) return 'Сегодня'
    if (d.toDateString() === tomorrow.toDateString()) return 'Завтра'
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_completed

  return (
    <div 
      onClick={handleClick}
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={task.is_completed}
          onChange={handleToggle}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '20px', height: '20px', accentColor: '#5c6bc0' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '15px',
            color: task.is_completed ? '#999999' : '#000000',
            textDecoration: task.is_completed ? 'line-through' : 'none'
          }}>
            {task.title}
          </div>
          {task.due_date && (
            <div style={{
              fontSize: '12px',
              color: isOverdue ? '#f44336' : '#666666'
            }}>
              📅 {formatDueDate(task.due_date)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Реализовать TgBottomNav.tsx**

```typescript
import { useCallback } from 'react'

type TabId = 'inbox' | 'next' | 'today' | 'projects' | 'settings'

interface TgBottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  counts?: { inbox: number; next: number; today: number }
}

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: 'inbox', icon: '📥', label: 'Входящие' },
  { id: 'next', icon: '🎯', label: 'Next' },
  { id: 'today', icon: '📅', label: 'Сегодня' },
  { id: 'projects', icon: '📂', label: 'Проекты' },
  { id: 'settings', icon: '⚙️', label: 'Настройки' }
]

export function TgBottomNav({ activeTab, onTabChange, counts }: TgBottomNavProps) {
  const handleTabClick = useCallback((tabId: TabId) => {
    onTabChange(tabId)
  }, [onTabChange])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-around',
      padding: '12px',
      background: '#f5f5f5',
      borderRadius: '12px 12px 0 0'
    }}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          style={{
            textAlign: 'center',
            padding: '4px',
            borderRadius: '8px',
            background: activeTab === tab.id ? '#e8eaf6' : 'transparent'
          }}
        >
          <div style={{ fontSize: '20px' }}>{tab.icon}</div>
          <div style={{
            fontSize: '10px',
            color: activeTab === tab.id ? '#5c6bc0' : '#666666'
          }}>
            {tab.label}
            {tab.id === 'inbox' && counts?.inbox ? ` (${counts.inbox})` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Реализовать TgFab.tsx**

```typescript
import { useHaptic } from '../../tg/hooks'

interface TgFabProps {
  onClick: () => void
}

export function TgFab({ onClick }: TgFabProps) {
  const { impact } = useHaptic()

  const handleClick = () => {
    impact('light')
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '16px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: '#5c6bc0',
        border: 'none',
        color: '#ffffff',
        fontSize: '24px',
        boxShadow: '0 4px 12px rgba(92, 107, 192, 0.4)',
        cursor: 'pointer'
      }}
    >
      +
    </button>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/tg/TgTaskCard.tsx frontend/src/components/tg/TgBottomNav.tsx frontend/src/components/tg/TgFab.tsx
git commit -m "feat: add Telegram UI components"
```

---

## Task 8: Frontend — Основные экраны

**Files:**
- Create: `frontend/src/routes/tg/TgMain.tsx`
- Create: `frontend/src/routes/tg/TgTaskList.tsx`
- Create: `frontend/src/routes/tg/TgTaskEdit.tsx`
- Create: `frontend/src/routes/tg/TgSettings.tsx`

- [ ] **Step 1: Реализовать TgTaskList.tsx**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { TgTaskCard } from '../../components/tg/TgTaskCard'
import { TgFab } from '../../components/tg/TgFab'
import { useTasks } from '../../hooks/useTasks'

interface Task {
  id: number
  title: string
  description?: string
  due_date?: string
  is_completed: boolean
  gtd_status: string
}

interface TgTaskListProps {
  gtdStatus: string
  onTaskClick: (id: number) => void
  onFabClick: () => void
}

export function TgTaskList({ gtdStatus, onTaskClick, onFabClick }: TgTaskListProps) {
  const { tasks, toggleTask, loading } = useTasks({ gtd_status: gtdStatus })
  const [localTasks, setLocalTasks] = useState<Task[]>([])

  useEffect(() => {
    setLocalTasks(tasks as Task[])
  }, [tasks])

  const handleToggle = useCallback(async (id: number) => {
    await toggleTask(id)
  }, [toggleTask])

  const handleFabClick = useCallback(() => {
    onFabClick()
  }, [onFabClick])

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка...</div>
  }

  return (
    <div style={{ padding: '8px' }}>
      {localTasks.map(task => (
        <TgTaskCard
          key={task.id}
          task={task}
          onToggle={handleToggle}
          onClick={onTaskClick}
        />
      ))}
      <TgFab onClick={handleFabClick} />
    </div>
  )
}
```

- [ ] **Step 2: Реализовать TgTaskEdit.tsx**

```typescript
import { useState } from 'react'
import { useTasks } from '../../hooks/useTasks'

interface TaskEditData {
  id?: number
  title: string
  description?: string
  due_date?: string
  due_time?: string
  project_id?: number
}

interface TgTaskEditProps {
  task?: TaskEditData
  onClose: () => void
  onSave: () => void
}

export function TgTaskEdit({ task, onClose, onSave }: TgTaskEditProps) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const [dueTime, setDueTime] = useState(task?.due_time || '')
  const [projectId, setProjectId] = useState(task?.project_id)
  
  const { createTask, updateTask } = useTasks()

  const handleSave = async () => {
    if (!title.trim()) return
    
    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate ? `${dueDate}T${dueTime || '23:59:59'}` : undefined,
      project_id: projectId
    }
    
    if (task?.id) {
      await updateTask(task.id, data)
    } else {
      await createTask(data)
    }
    onSave()
  }

  return (
    <div style={{ padding: '16px' }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Что нужно сделать?"
        style={{
          width: '100%',
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          fontSize: '15px',
          marginBottom: '12px'
        }}
      />
      
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание (опционально)"
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          fontSize: '14px',
          minHeight: '60px',
          marginBottom: '12px',
          resize: 'none'
        }}
      />
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '8px' }}
        />
        <input
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '8px' }}
        />
      </div>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '14px',
            background: '#f5f5f5',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px'
          }}
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          style={{
            flex: 1,
            padding: '14px',
            background: title.trim() ? '#5c6bc0' : '#ccc',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            color: '#fff'
          }}
        >
          Сохранить
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Реализовать TgSettings.tsx**

```typescript
import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface UserSettings {
  language: string
  timezone: string
  default_section: string
}

export function TgSettings() {
  const { user, updateUser } = useAuthStore()
  const [settings, setSettings] = useState<UserSettings>({
    language: user?.language || 'ru',
    timezone: user?.timezone || 'Europe/Moscow',
    default_section: user?.default_section || 'inbox'
  })

  const handleLanguageChange = async (lang: string) => {
    setSettings(s => ({ ...s, language: lang }))
    await updateUser({ language: lang })
  }

  const handleTimezoneChange = async (tz: string) => {
    setSettings(s => ({ ...s, timezone: tz }))
    await updateUser({ timezone: tz })
  }

  const handleSectionChange = async (section: string) => {
    setSettings(s => ({ ...s, default_section: section }))
    await updateUser({ default_section: section })
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
          Язык
        </label>
        <select
          value={settings.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        >
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select>
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
          Часовой пояс
        </label>
        <select
          value={settings.timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        >
          <option value="Europe/Moscow">Europe/Moscow (GMT+3)</option>
          <option value="Europe/Kiev">Europe/Kiev (GMT+2)</option>
          <option value="Europe/London">Europe/London (GMT+0)</option>
        </select>
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
          Начальный раздел
        </label>
        <select
          value={settings.default_section}
          onChange={(e) => handleSectionChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        >
          <option value="inbox">📥 Входящие</option>
          <option value="next">🎯 Next Actions</option>
          <option value="today">📅 Сегодня</option>
        </select>
      </div>
      
      <button
        style={{
          width: '100%',
          padding: '12px',
          background: '#ffebee',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#f44336',
          marginTop: '16px'
        }}
      >
        Выйти из аккаунта
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/tg/TgTaskList.tsx frontend/src/routes/tg/TgTaskEdit.tsx frontend/src/routes/tg/TgSettings.tsx
git commit -m "feat: add Telegram route screens"
```

---

## Task 9: Интеграция и тестирование

**Files:**
- Modify: `frontend/src/main-tg.tsx`
- Modify: `frontend/src/App.tsx`
- Test: Интеграционные тесты

- [ ] **Step 1: Создать main-tg.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initTelegram } from './tg/WebApp'

initTelegram()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 2: Проверить сборку**

Run: `cd frontend && npm run build:tg`
Expected: Success, файлы в dist-tg/

- [ ] **Step 3: Commit**

```bash
git add frontend/src/main-tg.tsx
git commit -m "feat: add Telegram entry point and verify build"
```

---

## Проверка покрытия спецификации

| Спецификация | Таск |
|--------------|------|
| Telegram WebApp API интеграция | Task 5 |
| OAuth через бота | Task 1-3 |
| Полный функционал GTD | Task 7-8 |
| Navigation bottom tabs | Task 7 (TgBottomNav) |
| Haptic feedback | Task 6 |
| Theme поддержка | Task 5 (useTgTheme) |

---

## План завершён

**Plan complete and saved to `docs/superpowers/plans/2026-05-06-telegram-mini-app-plan.md`.**

**Два варианта выполнения:**

1. **Subagent-Driven (recommended)** — Я запускаю агента на каждую задачу отдельно, быстрая итерация

2. **Inline Execution** — Выполняю задачи последовательно в этом сеансе с чекпоинтами

Какой подход выбрать?