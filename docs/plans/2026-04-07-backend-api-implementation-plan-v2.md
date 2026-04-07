# Backend API Implementation Plan v2

**Дата:** 2026-04-07
**Версия:** 2.0 (исправленная после критики)
**Цель:** Реализовать все API endpoints для аутентификации и управления задачами
**Проблема:** Бэкенд возвращает 404 для всех endpoints, так как они не реализованы

---

## Изменения относительно v1

Исправлены все блокирующие проблемы и предупреждения из критики:

| # | Проблема | Исправление |
|---|----------|-------------|
| B1 | ID типы: модели `str`, план `UUID` | Сервисы принимают `str`, преобразование `str(obj)` при запросах |
| B2 | Двойной commit (сервисы + get_db) | Сервисы используют `flush()`, `get_db()` владеет транзакцией |
| B3 | `from app.models import Base` не работает | Исправлено на `from app.database import Base` |
| B4 | Порядок: deps.py импортирует TaskService до создания | Фаза 2 (TaskService) идёт перед Фазой 3 (dependencies) |
| B5 | Refresh endpoint не проверяет `type == "refresh"` | Добавлена проверка типа токена |
| B6 | `datetime.utcnow()` устарел в Python 3.12+ | Добавлена Фаза 0: исправление security.py |
| W1 | Нет `invite_code` в RegisterRequest | Добавлено поле `invite_code: str \| None = None` |
| W2 | Тесты используют sync TestClient с @asyncio | Все тесты используют `httpx.AsyncClient` через фикстуру |
| W3 | TaskListResponse не используется | Добавлен endpoint toggle, TaskListResponse убрана из MVP |
| W4 | toggle_task без endpoint | Добавлен `PATCH /{task_id}/toggle` |
| W5 | get_current_active_user не используется | Убрана из dependencies (YAGNI, нет механизма деактивации) |
| W6 | register использует Depends(get_db) вместо сервиса | Все endpoints используют фабрики сервисов |
| W7 | Unused imports (delete, selectinload) | Убраны неиспользуемые импорты |
| W8 | Нет pytest config | Добавлен `[tool.pytest.ini_options]` |

---

## Текущее состояние

### ✅ Что существует
- Модели данных: `User` (id: str/UUID, username, email, password_hash, is_active), `Task` (id: str/UUID, user_id, title, description, is_completed) — `app/models/`
- Pydantic schemas: `UserResponse`, `RegisterRequest`, `LoginRequest`, `TokenResponse`, `TaskCreate`, `TaskUpdate`, `TaskResponse`, `TaskListResponse` — `app/schemas/`
- Security утилиты: хеширование паролей, JWT токены, cookies — `app/security.py`
- Настройка БД: async SQLAlchemy + aiosqlite — `app/database.py`
- Конфигурация: Settings class (registration_enabled, invite_code) — `app/config.py`
- Все зависимости в pyproject.toml

### ❌ Что отсутствует
- Сервисный слой (бизнес-логика)
- Auth dependencies (get_current_user)
- Реализация API endpoints (только заглушки)
- Тесты (пустая директория tests/)
- pytest конфигурация
- invite_code поле в RegisterRequest

### ⚠️ Важные особенности кодовой базы
- **ID типы:** Модели используют `String(36)` для UUID (строковое представление). Pydantic схемы объявляют `id: UUID` с `from_attributes=True` — Pydantic автоматически конвертирует `str → UUID` при сериализации. В сервисах нужно передавать `str` для корректной работы SQLAlchemy фильтров.
- **Управление транзакциями:** `get_db()` в `database.py` автоматически делает commit при успехе и rollback при ошибке. **Сервисы НЕ должны вызывать commit()** — только `flush()` для получения ID и записи в сессию.

---

## План реализации

### Фаза 0: Предварительные исправления

#### 0.1 Исправление security.py — замена устаревшего datetime.utcnow()

**Файл:** `app/security.py`

```python
# ЗАМЕНИТЬ:
from datetime import datetime, timedelta
# ... и все datetime.utcnow() на datetime.now(timezone.utc)

# НА:
from datetime import datetime, timedelta, timezone

# В create_access_token:
expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))

# В create_refresh_token:
expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=settings.refresh_token_expire_days))
```

#### 0.2 Добавление invite_code в RegisterRequest

**Файл:** `app/schemas/auth.py`

```python
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)
    invite_code: str | None = None
```

#### 0.3 Добавление pytest конфигурации

**Файл:** `pyproject.toml` — добавить секцию:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

---

### Фаза 1: Сервисный слой аутентификации

**Файл:** `app/services/auth_service.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest
from app.security import hash_password, verify_password, create_access_token, create_refresh_token
from datetime import timedelta
from typing import Optional


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_user(self, data: RegisterRequest) -> User:
        """Регистрация нового пользователя с хешированием пароля"""
        # Проверка существования username
        existing_username = await self.get_user_by_username(data.username)
        if existing_username:
            raise ValueError(f"Username '{data.username}' already exists")
        # Проверка существования email
        existing_email = await self.get_user_by_email(data.email)
        if existing_email:
            raise ValueError(f"Email '{data.email}' already exists")
        # Хеширование пароля
        password_hash = hash_password(data.password)
        # Создание пользователя
        user = User(
            username=data.username,
            email=data.email,
            password_hash=password_hash,
        )
        self.db.add(user)
        await self.db.flush()
        # Возврат созданного пользователя (без commit — get_db управляет транзакцией)

    async def authenticate_user(self, data: LoginRequest) -> Optional[User]:
        """Проверка пароля и возврат пользователя"""
        user = await self.get_user_by_username(data.username)
        if not user:
            return None
        if not verify_password(data.password, user.password_hash):
            return None
        return user

    async def create_tokens(self, user: User) -> tuple[str, str]:
        """Генерация access и refresh токенов"""
        token_data = {"sub": str(user.id)}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        return access_token, refresh_token

    async def refresh_tokens(self, user_id: str) -> tuple[str, str]:
        """Обновление токенов по user_id"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None, None
        return await self.create_tokens(user)

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Поиск пользователя по ID"""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Поиск пользователя по username"""
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Поиск пользователя по email"""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
```

**Ключевые решения:**
- `user_id` передаётся как `str`, не `UUID` — модели используют `String(36)`
- `create_tokens` использует `{"sub": str(user.id)}` — строковый subject
- Сервисы вызывают `flush()`, **не** `commit()` — транзакцией владеет `get_db()`
- `create_user` выбрасывает `ValueError` при дубликате (ловится в endpoint)

**Зависимости:**
- ✅ Модели User
- ✅ Schemas RegisterRequest, LoginRequest (с invite_code — Фаза 0.2)
- ✅ Security функции

---

### Фаза 2: Сервисный слой задач

**Файл:** `app/services/task_service.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate
from typing import Optional, List


class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_tasks(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        completed: Optional[bool] = None
    ) -> List[Task]:
        """Получение списка задач пользователя с пагинацией и фильтрацией"""
        query = select(Task).where(Task.user_id == user_id)
        if completed is not None:
            query = query.where(Task.is_completed == completed)
        query = query.order_by(Task.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_task(self, user_id: str, data: TaskCreate) -> Task:
        """Создание новой задачи"""
        task = Task(
            user_id=user_id,
            title=data.title,
            description=data.description,
        )
        self.db.add(task)
        await self.db.flush()
        return task

    async def get_task_by_id(self, task_id: str, user_id: str) -> Optional[Task]:
        """Поиск задачи по ID с проверкой принадлежности пользователю"""
        result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update_task(
        self,
        task_id: str,
        user_id: str,
        data: TaskUpdate
    ) -> Optional[Task]:
        """Обновление задачи с проверкой принадлежности пользователю"""
        task = await self.get_task_by_id(task_id, user_id)
        if not task:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)
        await self.db.flush()
        return task

    async def delete_task(self, task_id: str, user_id: str) -> bool:
        """Удаление задачи с проверкой принадлежности пользователю"""
        task = await self.get_task_by_id(task_id, user_id)
        if not task:
            return False
        await self.db.delete(task)
        await self.db.flush()
        return True

    async def toggle_task(self, task_id: str, user_id: str) -> Optional[Task]:
        """Переключение статуса completed"""
        task = await self.get_task_by_id(task_id, user_id)
        if not task:
            return None
        task.is_completed = not task.is_completed
        await self.db.flush()
        return task
```

**Ключевые решения:**
- Все `user_id` и `task_id` — `str`, не `UUID`
- Убраны неиспользуемые импорты (`delete`, `selectinload`)
- `flush()` вместо `commit()`
- `model_dump(exclude_unset=True)` для partial update

**Зависимости:**
- ✅ Модель Task
- ✅ Schemas TaskCreate, TaskUpdate

---

### Фаза 3: Dependencies

**Файл:** `app/dependencies.py`

```python
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.security import decode_token
from app.services.auth_service import AuthService
from app.services.task_service import TaskService
from app.models.user import User

security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    """Декодирование JWT токена и получение пользователя"""
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    # Проверка типа токена — только access
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    auth_service = AuthService(db)
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def get_auth_service(db: Annotated[AsyncSession, Depends(get_db)]) -> AuthService:
    """Фабрика для получения AuthService"""
    return AuthService(db)


def get_task_service(db: Annotated[AsyncSession, Depends(get_db)]) -> TaskService:
    """Фабрика для получения TaskService"""
    return TaskService(db)
```

**Ключевые решения:**
- `get_current_user` проверяет `payload["type"] == "access"` — refresh токен нельзя использовать для API
- `user_id` извлекается как `str` из `"sub"` claim
- Убрана `get_current_active_user` — нет механизма деактивации (YAGNI)
- Оба сервиса импортируются после их создания (Фаза 1 и 2 уже выполнены)

**Зависимости:**
- ✅ decode_token из security.py (исправлен в Фазе 0)
- ✅ AuthService (Фаза 1)
- ✅ TaskService (Фаза 2)
- ✅ get_db из database.py

---

### Фаза 4: Auth Endpoints

**Файл:** `app/api/auth.py` (замена заглушки)

```python
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.security import set_refresh_cookie, clear_refresh_cookie, decode_token
from app.dependencies import get_auth_service, get_current_user
from app.config import settings
from app.models.user import User
from app.services.auth_service import AuthService

auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Регистрация нового пользователя"""
    # Проверка registration_enabled из settings
    if not settings.registration_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is disabled",
        )
    # Проверка invite_code (если настроен)
    if settings.invite_code is not None:
        if data.invite_code != settings.invite_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid invite code",
            )
    # Создание пользователя
    try:
        user = await auth_service.create_user(data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    # Генерация токенов
    access_token, refresh_token = await auth_service.create_tokens(user)
    # Установка refresh cookie
    set_refresh_cookie(response, refresh_token)
    # Возврат TokenResponse
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@auth_router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Вход в систему"""
    user = await auth_service.authenticate_user(data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token, refresh_token = await auth_service.create_tokens(user)
    set_refresh_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Обновление access токена"""
    # Получение refresh_token из cookie
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )
    # Декодирование refresh токена
    payload = decode_token(refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    # Проверка типа токена — только refresh
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    # Обновление токенов
    access_token, new_refresh_token = await auth_service.refresh_tokens(user_id)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    set_refresh_cookie(response, new_refresh_token)
    # Получаем пользователя для ответа
    user = await auth_service.get_user_by_id(user_id)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@auth_router.post("/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user)):
    """Выход из системы"""
    clear_refresh_cookie(response)
    return {"message": "Successfully logged out"}


@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Получение информации о текущем пользователе"""
    return UserResponse.model_validate(current_user)
```

**Ключевые решения:**
- Все endpoints используют `Depends(get_auth_service)` вместо `Depends(get_db)`
- `register` проверяет `settings.registration_enabled` и `settings.invite_code`
- `refresh` endpoint **проверяет `type == "refresh"`** — access токен нельзя использовать для обновления
- `ValueError` из сервиса перехватывается и превращается в 400
- Добавлен `Request` параметр для чтения cookies в refresh

**Зависимости:**
- ✅ Schemas (с invite_code — Фаза 0.2)
- ✅ Security функции
- ✅ get_auth_service, get_current_user (Фаза 3)
- ✅ AuthService (Фаза 1)

---

### Фаза 5: Task Endpoints

**Файл:** `app/api/tasks.py` (замена заглушки)

```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from uuid import UUID
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.dependencies import get_task_service, get_current_user
from app.models.user import User
from app.services.task_service import TaskService

tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])


@tasks_router.get("", response_model=List[TaskResponse])
async def get_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    completed: bool | None = Query(None),
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    """Получение списка задач пользователя"""
    tasks = await task_service.get_user_tasks(
        user_id=str(current_user.id),
        skip=skip,
        limit=limit,
        completed=completed,
    )
    return [TaskResponse.model_validate(t) for t in tasks]


@tasks_router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    """Создание новой задачи"""
    task = await task_service.create_task(
        user_id=str(current_user.id),
        data=data,
    )
    return TaskResponse.model_validate(task)


@tasks_router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    """Получение задачи по ID"""
    task = await task_service.get_task_by_id(str(task_id), str(current_user.id))
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return TaskResponse.model_validate(task)


@tasks_router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    """Обновление задачи"""
    task = await task_service.update_task(str(task_id), str(current_user.id), data)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return TaskResponse.model_validate(task)


@tasks_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    """Удаление задачи"""
    deleted = await task_service.delete_task(str(task_id), str(current_user.id))
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return None


@tasks_router.patch("/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
):
    """Переключение статуса completed"""
    task = await task_service.toggle_task(str(task_id), str(current_user.id))
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return TaskResponse.model_validate(task)
```

**Ключевые решения:**
- `task_id: UUID` в path параметрах — FastAPI валидирует формат и парсит как UUID
- `str(task_id)` и `str(current_user.id)` — явная конвертация для SQLAlchemy запросов
- Добавлен `PATCH /{task_id}/toggle` для toggle_task
- Все endpoints используют `Depends(get_task_service)` и `Depends(get_current_user)`

**Зависимости:**
- ✅ Schemas TaskCreate, TaskUpdate, TaskResponse
- ✅ get_task_service, get_current_user (Фаза 3)
- ✅ TaskService (Фаза 2)

---

### Фаза 6: Тесты

#### 6.1 Фикстуры для тестов

**Файл:** `tests/conftest.py`

```python
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.database import Base, get_db
from httpx import AsyncClient, ASGITransport
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture(scope="function")
async def db_session():
    """Создание тестовой БД для каждого теста"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client(db_session: AsyncSession):
    """Async test client с переопределенной БД"""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session: AsyncSession):
    """Создание тестового пользователя"""
    from app.services.auth_service import AuthService
    from app.schemas.auth import RegisterRequest

    service = AuthService(db_session)
    user = await service.create_user(RegisterRequest(
        username="testuser",
        email="test@example.com",
        password="testpassword123",
    ))
    await db_session.flush()
    return user


@pytest.fixture
async def test_task(db_session: AsyncSession, test_user):
    """Создание тестовой задачи"""
    from app.services.task_service import TaskService
    from app.schemas.task import TaskCreate

    service = TaskService(db_session)
    task = await service.create_task(
        user_id=str(test_user.id),
        data=TaskCreate(title="Test Task", description="Test Description"),
    )
    await db_session.flush()
    return task
```

**Ключевые решения:**
- `from app.database import Base` (не `from app.models`)
- `ASGITransport(app=app)` — правильный способ для httpx.AsyncClient с ASGI
- Фикстуры используют `flush()` вместо `commit()`
- `test_user.id` передаётся как `str(test_user.id)` в TaskService

#### 6.2 Unit тесты для AuthService

**Файл:** `tests/test_auth_service.py`

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest, LoginRequest
from app.models.user import User


async def test_create_user_success(db_session: AsyncSession):
    service = AuthService(db_session)
    user = await service.create_user(RegisterRequest(
        username="newuser",
        email="new@example.com",
        password="testpassword123",
    ))
    await db_session.flush()
    assert user is not None
    assert user.username == "newuser"
    assert user.email == "new@example.com"
    assert user.password_hash != "testpassword123"
    assert user.is_active is True


async def test_create_user_duplicate_username(db_session: AsyncSession):
    service = AuthService(db_session)
    await service.create_user(RegisterRequest(
        username="dupuser",
        email="first@example.com",
        password="testpassword123",
    ))
    await db_session.flush()
    with pytest.raises(ValueError, match="already exists"):
        await service.create_user(RegisterRequest(
            username="dupuser",
            email="second@example.com",
            password="testpassword123",
        ))


async def test_create_user_duplicate_email(db_session: AsyncSession):
    service = AuthService(db_session)
    await service.create_user(RegisterRequest(
        username="user1",
        email="dup@example.com",
        password="testpassword123",
    ))
    await db_session.flush()
    with pytest.raises(ValueError, match="already exists"):
        await service.create_user(RegisterRequest(
            username="user2",
            email="dup@example.com",
            password="testpassword123",
        ))


async def test_authenticate_user_success(db_session: AsyncSession):
    service = AuthService(db_session)
    await service.create_user(RegisterRequest(
        username="authuser",
        email="auth@example.com",
        password="testpassword123",
    ))
    await db_session.flush()
    user = await service.authenticate_user(LoginRequest(
        username="authuser",
        password="testpassword123",
    ))
    assert user is not None
    assert user.username == "authuser"


async def test_authenticate_user_wrong_password(db_session: AsyncSession):
    service = AuthService(db_session)
    await service.create_user(RegisterRequest(
        username="wrongpw",
        email="wrong@example.com",
        password="testpassword123",
    ))
    await db_session.flush()
    user = await service.authenticate_user(LoginRequest(
        username="wrongpw",
        password="wrongpassword",
    ))
    assert user is None


async def test_authenticate_user_not_found(db_session: AsyncSession):
    service = AuthService(db_session)
    user = await service.authenticate_user(LoginRequest(
        username="nonexistent",
        password="testpassword123",
    ))
    assert user is None


async def test_create_tokens(test_user):
    service = AuthService(None)
    access_token, refresh_token = await service.create_tokens(test_user)
    assert access_token is not None
    assert refresh_token is not None
    assert len(access_token) > 0
    assert len(refresh_token) > 0

    from app.security import decode_token
    access_payload = decode_token(access_token)
    refresh_payload = decode_token(refresh_token)
    assert access_payload.get("type") == "access"
    assert refresh_payload.get("type") == "refresh"
    assert access_payload.get("sub") == str(test_user.id)


async def test_get_user_by_id(db_session: AsyncSession, test_user):
    service = AuthService(db_session)
    found = await service.get_user_by_id(str(test_user.id))
    assert found is not None
    assert found.id == test_user.id
    assert found.username == test_user.username
```

#### 6.3 Unit тесты для TaskService

**Файл:** `tests/test_task_service.py`

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.task_service import TaskService
from app.schemas.task import TaskCreate, TaskUpdate
from app.models.task import Task


async def test_create_task(db_session: AsyncSession, test_user):
    service = TaskService(db_session)
    task = await service.create_task(
        user_id=str(test_user.id),
        data=TaskCreate(title="My Task"),
    )
    await db_session.flush()
    assert task is not None
    assert task.user_id == str(test_user.id)
    assert task.title == "My Task"
    assert task.is_completed is False


async def test_get_user_tasks_empty(db_session: AsyncSession, test_user):
    service = TaskService(db_session)
    tasks = await service.get_user_tasks(str(test_user.id))
    assert tasks == []


async def test_get_user_tasks_with_data(db_session: AsyncSession, test_user):
    service = TaskService(db_session)
    await service.create_task(str(test_user.id), TaskCreate(title="First"))
    await service.create_task(str(test_user.id), TaskCreate(title="Second"))
    await db_session.flush()
    tasks = await service.get_user_tasks(str(test_user.id))
    assert len(tasks) == 2
    assert tasks[0].title == "Second"  # DESC by created_at


async def test_get_user_tasks_filter_completed(db_session: AsyncSession, test_user):
    service = TaskService(db_session)
    t1 = await service.create_task(str(test_user.id), TaskCreate(title="Active"))
    t2 = await service.create_task(str(test_user.id), TaskCreate(title="Done"))
    t2.is_completed = True
    await db_session.flush()
    completed = await service.get_user_tasks(str(test_user.id), completed=True)
    assert len(completed) == 1
    assert completed[0].title == "Done"
    active = await service.get_user_tasks(str(test_user.id), completed=False)
    assert len(active) == 1
    assert active[0].title == "Active"


async def test_get_task_by_id_success(db_session: AsyncSession, test_user, test_task):
    service = TaskService(db_session)
    found = await service.get_task_by_id(str(test_task.id), str(test_user.id))
    assert found is not None
    assert found.id == test_task.id


async def test_get_task_by_id_not_owner(db_session: AsyncSession, test_user):
    from app.services.auth_service import AuthService
    from app.schemas.auth import RegisterRequest
    auth_service = AuthService(db_session)
    other_user = await auth_service.create_user(RegisterRequest(
        username="other", email="other@example.com", password="password123",
    ))
    task_service = TaskService(db_session)
    task = await task_service.create_task(str(other_user.id), TaskCreate(title="Other's Task"))
    await db_session.flush()
    found = await task_service.get_task_by_id(str(task.id), str(test_user.id))
    assert found is None


async def test_update_task(db_session: AsyncSession, test_user, test_task):
    service = TaskService(db_session)
    updated = await service.update_task(
        str(test_task.id), str(test_user.id),
        TaskUpdate(title="Updated Title"),
    )
    await db_session.flush()
    assert updated.title == "Updated Title"
    assert updated.description == test_task.description  # не изменено


async def test_delete_task(db_session: AsyncSession, test_user, test_task):
    service = TaskService(db_session)
    deleted = await service.delete_task(str(test_task.id), str(test_user.id))
    await db_session.flush()
    assert deleted is True
    found = await service.get_task_by_id(str(test_task.id), str(test_user.id))
    assert found is None


async def test_toggle_task(db_session: AsyncSession, test_user, test_task):
    service = TaskService(db_session)
    toggled = await service.toggle_task(str(test_task.id), str(test_user.id))
    await db_session.flush()
    assert toggled.is_completed is True
    toggled_again = await service.toggle_task(str(test_task.id), str(test_user.id))
    await db_session.flush()
    assert toggled_again.is_completed is False
```

#### 6.4 Integration тесты для Auth API

**Файл:** `tests/test_api_auth.py`

```python
import pytest
from httpx import AsyncClient


async def test_register_success(client: AsyncClient):
    response = await client.post("/api/auth/register", json={
        "username": "newuser",
        "email": "new@example.com",
        "password": "testpassword123",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "newuser"
    assert "refresh_token" in response.cookies


async def test_register_duplicate_username(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "username": "dupuser", "email": "first@example.com", "password": "testpassword123",
    })
    response = await client.post("/api/auth/register", json={
        "username": "dupuser", "email": "second@example.com", "password": "testpassword123",
    })
    assert response.status_code == 400


async def test_register_duplicate_email(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "username": "user1", "email": "dup@example.com", "password": "testpassword123",
    })
    response = await client.post("/api/auth/register", json={
        "username": "user2", "email": "dup@example.com", "password": "testpassword123",
    })
    assert response.status_code == 400


async def test_register_invalid_data(client: AsyncClient):
    response = await client.post("/api/auth/register", json={
        "username": "ab", "email": "bad-email", "password": "short",
    })
    assert response.status_code == 422


async def test_login_success(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "username": "loginuser", "email": "login@example.com", "password": "testpassword123",
    })
    response = await client.post("/api/auth/login", json={
        "username": "loginuser", "password": "testpassword123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "loginuser"


async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "username": "wrongpw", "email": "wrong@example.com", "password": "testpassword123",
    })
    response = await client.post("/api/auth/login", json={
        "username": "wrongpw", "password": "wrongpassword",
    })
    assert response.status_code == 401


async def test_login_not_found(client: AsyncClient):
    response = await client.post("/api/auth/login", json={
        "username": "nonexistent", "password": "testpassword123",
    })
    assert response.status_code == 401


async def test_refresh_success(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "username": "refreshuser", "email": "refresh@example.com", "password": "testpassword123",
    })
    response = await client.post("/api/auth/refresh")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


async def test_refresh_no_cookie(client: AsyncClient):
    response = await client.post("/api/auth/refresh")
    assert response.status_code == 401


async def test_logout(client: AsyncClient):
    reg = await client.post("/api/auth/register", json={
        "username": "logoutuser", "email": "logout@example.com", "password": "testpassword123",
    })
    token = reg.json()["access_token"]
    response = await client.post("/api/auth/logout", headers={
        "Authorization": f"Bearer {token}",
    })
    assert response.status_code == 200


async def test_get_me(client: AsyncClient):
    reg = await client.post("/api/auth/register", json={
        "username": "meuser", "email": "me@example.com", "password": "testpassword123",
    })
    token = reg.json()["access_token"]
    response = await client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}",
    })
    assert response.status_code == 200
    assert response.json()["username"] == "meuser"


async def test_get_me_unauthorized(client: AsyncClient):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401
```

#### 6.5 Integration тесты для Tasks API

**Файл:** `tests/test_api_tasks.py`

```python
import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, username="taskuser", email="task@example.com"):
    reg = await client.post("/api/auth/register", json={
        "username": username, "email": email, "password": "testpassword123",
    })
    token = reg.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_get_tasks_empty(client: AsyncClient):
    headers = await _register_and_login(client)
    response = await client.get("/api/tasks", headers=headers)
    assert response.status_code == 200
    assert response.json() == []


async def test_create_task(client: AsyncClient):
    headers = await _register_and_login(client)
    response = await client.post("/api/tasks", headers=headers, json={
        "title": "New Task", "description": "Description",
    })
    assert response.status_code == 201
    assert response.json()["title"] == "New Task"


async def test_get_tasks(client: AsyncClient):
    headers = await _register_and_login(client)
    await client.post("/api/tasks", headers=headers, json={"title": "Task 1"})
    await client.post("/api/tasks", headers=headers, json={"title": "Task 2"})
    response = await client.get("/api/tasks", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


async def test_get_task_by_id(client: AsyncClient):
    headers = await _register_and_login(client)
    created = await client.post("/api/tasks", headers=headers, json={"title": "Find Me"})
    task_id = created.json()["id"]
    response = await client.get(f"/api/tasks/{task_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["title"] == "Find Me"


async def test_get_task_not_found(client: AsyncClient):
    headers = await _register_and_login(client)
    response = await client.get("/api/tasks/00000000-0000-0000-0000-000000000000", headers=headers)
    assert response.status_code == 404


async def test_update_task(client: AsyncClient):
    headers = await _register_and_login(client)
    created = await client.post("/api/tasks", headers=headers, json={"title": "Old Title"})
    task_id = created.json()["id"]
    response = await client.put(f"/api/tasks/{task_id}", headers=headers, json={"title": "New Title"})
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"


async def test_delete_task(client: AsyncClient):
    headers = await _register_and_login(client)
    created = await client.post("/api/tasks", headers=headers, json={"title": "Delete Me"})
    task_id = created.json()["id"]
    response = await client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert response.status_code == 204
    response = await client.get(f"/api/tasks/{task_id}", headers=headers)
    assert response.status_code == 404


async def test_toggle_task(client: AsyncClient):
    headers = await _register_and_login(client)
    created = await client.post("/api/tasks", headers=headers, json={"title": "Toggle Me"})
    task_id = created.json()["id"]
    response = await client.patch(f"/api/tasks/{task_id}/toggle", headers=headers)
    assert response.status_code == 200
    assert response.json()["is_completed"] is True


async def test_get_tasks_unauthorized(client: AsyncClient):
    response = await client.get("/api/tasks")
    assert response.status_code == 401


async def test_create_task_unauthorized(client: AsyncClient):
    response = await client.post("/api/tasks", json={"title": "No Auth"})
    assert response.status_code == 401


async def test_filter_tasks_completed(client: AsyncClient):
    headers = await _register_and_login(client, "filteruser", "filter@example.com")
    await client.post("/api/tasks", headers=headers, json={"title": "Active"})
    created = await client.post("/api/tasks", headers=headers, json={"title": "Done"})
    task_id = created.json()["id"]
    await client.patch(f"/api/tasks/{task_id}/toggle", headers=headers)
    response = await client.get("/api/tasks?completed=true", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["is_completed"] is True


async def test_filter_tasks_active(client: AsyncClient):
    headers = await _register_and_login(client, "activeuser", "active@example.com")
    await client.post("/api/tasks", headers=headers, json={"title": "Active"})
    created = await client.post("/api/tasks", headers=headers, json={"title": "Done"})
    task_id = created.json()["id"]
    await client.patch(f"/api/tasks/{task_id}/toggle", headers=headers)
    response = await client.get("/api/tasks?completed=false", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["is_completed"] is False
```

---

## Порядок реализации

### Итерация 1: Предварительные исправления
1. Фаза 0.1: Исправление `datetime.utcnow()` → `datetime.now(timezone.utc)` в security.py
2. Фаза 0.2: Добавление `invite_code` в RegisterRequest
3. Фаза 0.3: Добавление pytest конфигурации в pyproject.toml

### Итерация 2: Сервисный слой
4. Фаза 1: AuthService (с `flush()` вместо `commit()`, `str` вместо `UUID`)
5. Фаза 2: TaskService (с `flush()`, `str`, toggle_task)

### Итерация 3: Dependencies и Endpoints
6. Фаза 3: dependencies.py (проверка `type == "access"`, без `get_current_active_user`)
7. Фаза 4: Auth Endpoints (проверка `type == "refresh"` в refresh, invite_code)
8. Фаза 5: Task Endpoints (включая `PATCH /{id}/toggle`)

### Итерация 4: Тесты
9. Фаза 6.1: conftest.py (с `from app.database import Base`)
10. Фаза 6.2-6.5: Все тесты (только `httpx.AsyncClient` через фикстуру `client`)

---

## Файлы для создания/изменения

### Новые файлы
- `app/services/auth_service.py`
- `app/services/task_service.py`
- `tests/conftest.py`
- `tests/test_auth_service.py`
- `tests/test_task_service.py`
- `tests/test_api_auth.py`
- `tests/test_api_tasks.py`

### Изменяемые файлы
- `app/security.py` — замена `datetime.utcnow()` на `datetime.now(timezone.utc)`
- `app/schemas/auth.py` — добавление `invite_code: str | None = None`
- `app/dependencies.py` — полная реализация
- `app/api/auth.py` — замена заглушки
- `app/api/tasks.py` — замена заглушки
- `pyproject.toml` — добавление `[tool.pytest.ini_options]`

---

## Проверка реализации

### Фаза 0
- [ ] `security.py` не содержит `datetime.utcnow()`
- [ ] `RegisterRequest` содержит поле `invite_code`
- [ ] `pytest.ini_options` добавлены в pyproject.toml

### Фаза 1
- [ ] `AuthService.create_user()` создает пользователя, возвращает User
- [ ] `AuthService.create_user()` выбрасывает `ValueError` при дубликате
- [ ] `AuthService.authenticate_user()` возвращает пользователя при верном пароле
- [ ] `AuthService.create_tokens()` генерирует access (type=access) и refresh (type=refresh)
- [ ] Ни один метод AuthService не вызывает `commit()`

### Фаза 2
- [ ] `TaskService.create_task()` создает задачу
- [ ] `TaskService.get_user_tasks()` возвращает список с пагинацией и фильтрацией
- [ ] `TaskService.update_task()` обновляет только переданные поля
- [ ] `TaskService.delete_task()` удаляет задачу
- [ ] `TaskService.toggle_task()` инвертирует `is_completed`
- [ ] Ни один метод TaskService не вызывает `commit()`

### Фаза 3
- [ ] `get_current_user()` проверяет `type == "access"`
- [ ] `get_current_user()` возвращает 401 при невалидном токене
- [ ] `get_current_user()` возвращает 401 при wrong token type

### Фаза 4
- [ ] POST /api/auth/register — 201, токены, cookie
- [ ] POST /api/auth/register — 403 если registration_enabled=False
- [ ] POST /api/auth/register — 403 при неверном invite_code
- [ ] POST /api/auth/register — 400 при дубликате username/email
- [ ] POST /api/auth/login — 200, токены
- [ ] POST /api/auth/login — 401 при неверных данных
- [ ] POST /api/auth/refresh — 200, проверяет `type == "refresh"`
- [ ] POST /api/auth/refresh — 401 при access токене вместо refresh
- [ ] POST /api/auth/logout — 200, очищает cookie
- [ ] GET /api/auth/me — 200, данные пользователя
- [ ] GET /api/auth/me — 401 без токена

### Фаза 5
- [ ] GET /api/tasks — список задач
- [ ] POST /api/tasks — 201, создание задачи
- [ ] GET /api/tasks/{id} — задача или 404
- [ ] PUT /api/tasks/{id} — обновление или 404
- [ ] DELETE /api/tasks/{id} — 204 или 404
- [ ] PATCH /api/tasks/{id}/toggle — переключение статуса
- [ ] Все task endpoints возвращают 401 без токена

### Фаза 6
- [ ] Все unit тесты проходят
- [ ] Все integration тесты проходят
- [ ] Покрытие тестами > 80%

---

## Примеры запросов

### Регистрация
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "testpassword123"}'
```

### Регистрация с invite code
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "testpassword123", "invite_code": "secret123"}'
```

### Вход
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpassword123"}' \
  -c cookies.txt
```

### Обновление токена
```bash
curl -X POST http://localhost:8000/api/auth/refresh \
  -b cookies.txt
```

### Получение задач
```bash
curl -X GET http://localhost:8000/api/tasks \
  -H "Authorization: Bearer <access_token>"
```

### Создание задачи
```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Task", "description": "Task description"}'
```

### Переключение статуса задачи
```bash
curl -X PATCH http://localhost:8000/api/tasks/<task_id>/toggle \
  -H "Authorization: Bearer <access_token>"
```

---

## Известные ограничения MVP

1. **Нет инвалидации refresh токенов** — украденный refresh токен действителен 7 дней. Нет "logout from all devices".
2. **SQLite** — блокировка БД при конкурентных записях. Приемлемо для MVP.
3. **Нет rate limiting** — auth endpoints без ограничений по частоте запросов.
4. **Куки `secure=True`** — требуют HTTPS. Для локальной разработки через HTTP может потребоваться временно `secure=False`.

---

## Дополнительные улучшения (будущее)

1. **Rate limiting** — ограничение запросов для auth endpoints
2. **Email verification** — подтверждение email при регистрации
3. **Password reset** — восстановление пароля
4. **OAuth2** — вход через Google, GitHub и т.д.
5. **Refresh token revocation** — таблица refresh_tokens для инвалидации
6. **Task categories/tags** — категоризация задач
7. **Task priorities** — приоритеты задач
8. **Task due dates** — дедлайны
9. **Task subtasks** — подзадачи
10. **File attachments** — прикрепление файлов к задачам
11. **Real-time updates** — WebSockets для обновлений
12. **Notifications** — уведомления о задачах
13. **Sharing tasks** — совместный доступ к задачам
14. **Task history** — история изменений задач
15. **Export/Import** — экспорт и импорт задач
16. **Analytics** — аналитика по выполнению задач
