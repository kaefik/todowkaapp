# Backend API Implementation Plan

**Дата:** 2026-04-07
**Цель:** Реализовать все API endpoints для аутентификации и управления задачами
**Проблема:** Бэкенд возвращает 404 для всех endpoints, так как они не реализованы

---

## Текущее состояние

### ✅ Что существует
- Модели данных: `User`, `Task` (app/models/)
- Pydantic schemas: `UserResponse`, `RegisterRequest`, `LoginRequest`, `TokenResponse`, `TaskCreate`, `TaskUpdate`, `TaskResponse` (app/schemas/)
- Security утилиты: хеширование паролей, JWT токены, cookies (app/security.py)
- Настройка БД: async SQLAlchemy + aiosqlite (app/database.py)
- Конфигурация: Settings class (app/config.py)
- Все необходимые зависимости в pyproject.toml

### ❌ Что отсутствует
- Сервисный слой (бизнес-логика)
- Auth dependencies (get_current_user)
- Реализация API endpoints (только заглушки)
- Тесты (пустая директория tests/)

---

## План реализации

### Фаза 1: Сервисный слой аутентификации

**Файл:** `app/services/auth_service.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest
from app.security import hash_password, verify_password, create_access_token, create_refresh_token
from uuid import UUID
from datetime import timedelta
from typing import Optional

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_user(self, data: RegisterRequest) -> User:
        """Регистрация нового пользователя с хешированием пароля"""
        # Проверка существования username
        # Проверка существования email
        # Хеширование пароля
        # Создание пользователя
        # Коммит в БД
        # Возврат созданного пользователя

    async def authenticate_user(self, data: LoginRequest) -> Optional[User]:
        """Проверка пароля и возврат пользователя"""
        # Поиск пользователя по username
        # Проверка пароля
        # Возврат пользователя или None

    async def create_tokens(self, user: User) -> tuple[str, str]:
        """Генерация access и refresh токенов"""
        # Создание access токена (15 минут)
        # Создание refresh токена (7 дней)
        # Возврат (access_token, refresh_token)

    async def refresh_tokens(self, user_id: UUID) -> tuple[str, str]:
        """Обновление access токена по refresh токену"""
        # Поиск пользователя по id
        # Создание новой пары токенов
        # Возврат (access_token, refresh_token)

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Поиск пользователя по ID"""
        # Запрос к БД
        # Возврат пользователя или None

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Поиск пользователя по username"""
        # Запрос к БД
        # Возврат пользователя или None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Поиск пользователя по email"""
        # Запрос к БД
        # Возврат пользователя или None
```

**Зависимости:**
- ✅ Модели User
- ✅ Schemas RegisterRequest, LoginRequest
- ✅ Security функции (hash_password, verify_password, create_access_token, create_refresh_token)

---

### Фаза 2: Сервисный слой задач

**Файл:** `app/services/task_service.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate
from uuid import UUID
from typing import Optional, List

class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_tasks(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        completed: Optional[bool] = None
    ) -> List[Task]:
        """Получение списка задач пользователя с пагинацией и фильтрацией"""
        # Query с фильтрами (user_id, completed если указан)
        # Сортировка по created_at DESC
        # Пагинация (offset/limit)
        # Возврат списка задач

    async def create_task(self, user_id: UUID, data: TaskCreate) -> Task:
        """Создание новой задачи"""
        # Создание объекта Task
        # Добавление в сессию
        # Коммит
        # Возврат созданной задачи

    async def get_task_by_id(self, task_id: UUID, user_id: UUID) -> Optional[Task]:
        """Поиск задачи по ID с проверкой принадлежности пользователю"""
        # Query с фильтром task_id AND user_id
        # Возврат задачи или None

    async def update_task(
        self,
        task_id: UUID,
        user_id: UUID,
        data: TaskUpdate
    ) -> Optional[Task]:
        """Обновление задачи с проверкой принадлежности пользователю"""
        # Поиск задачи
        # Если не найдена - возврат None
        # Обновление полей (только те, что переданы)
        # Коммит
        # Возврат обновленной задачи

    async def delete_task(self, task_id: UUID, user_id: UUID) -> bool:
        """Удаление задачи с проверкой принадлежности пользователю"""
        # Поиск задачи
        # Если не найдена - возврат False
        # Удаление из сессии
        # Коммит
        # Возврат True

    async def toggle_task(self, task_id: UUID, user_id: UUID) -> Optional[Task]:
        """Переключение статуса completed"""
        # Поиск задачи
        # Если не найдена - возврат None
        # Инверсия is_completed
        # Коммит
        # Возврат обновленной задачи
```

**Зависимости:**
- ✅ Модель Task
- ✅ Schemas TaskCreate, TaskUpdate

---

### Фаза 3: Auth Dependencies

**Файл:** `app/dependencies.py`

```python
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.security import decode_token
from app.services.auth_service import AuthService
from app.models.user import User

security = HTTPBearer()

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    """Декодирование JWT токена и получение пользователя"""
    # Извлечение токена из заголовка
    # Декодирование токена
    # Если токен невалидный - 401
    # Получение user_id из payload
    # Поиск пользователя через AuthService
    # Если пользователь не найден - 401
    # Возврат пользователя

async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Проверка, что пользователь активен"""
    # Если !current_user.is_active - 400
    # Возврат пользователя

def get_auth_service(db: Annotated[AsyncSession, Depends(get_db)]) -> AuthService:
    """Фабрика для получения AuthService"""
    return AuthService(db)

def get_task_service(db: Annotated[AsyncSession, Depends(get_db)]) -> TaskService:
    """Фабрика для получения TaskService"""
    return TaskService(db)
```

**Зависимости:**
- ✅ decode_token из security.py
- ✅ AuthService (будет создан в Фазе 1)
- ✅ get_db из database.py

---

### Фаза 4: Auth Endpoints

**Файл:** `app/api/auth.py` (замена заглушки)

```python
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.security import set_refresh_cookie, clear_refresh_cookie
from app.dependencies import get_auth_service, get_current_user
from app.models.user import User
from app.services.auth_service import AuthService

auth_router = APIRouter(prefix="/auth", tags=["auth"])

@auth_router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Регистрация нового пользователя"""
    # Получение AuthService
    # Проверка registration_enabled из settings
    # Если отключена - 403
    # Проверка invite_code (если включен)
    # Вызов create_user
    # Если пользователь уже существует - 400
    # Генерация токенов
    # Установка refresh cookie
    # Возврат TokenResponse с access_token и user

@auth_router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Вход в систему"""
    # Получение AuthService
    # Вызов authenticate_user
    # Если пользователь не найден или пароль неверен - 401
    # Генерация токенов
    # Установка refresh cookie
    # Возврат TokenResponse

@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Обновление access токена"""
    # Получение refresh_token из cookie
    # Если нет - 401
    # Декодирование refresh токена
    # Получение user_id из payload
    # Вызов refresh_tokens
    # Установка нового refresh cookie
    # Возврат TokenResponse

@auth_router.post("/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user)):
    """Выход из системы"""
    # Очистка refresh cookie
    # Возврат {"message": "Successfully logged out"}

@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Получение информации о текущем пользователе"""
    # Возврат UserResponse
```

**Зависимости:**
- ✅ RegisterRequest, LoginRequest, TokenResponse, UserResponse из schemas/auth.py
- ✅ set_refresh_cookie, clear_refresh_cookie из security.py
- ✅ get_auth_service, get_current_user из dependencies.py (Фаза 3)
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
    task_service: TaskService = Depends(get_task_service)
):
    """Получение списка задач пользователя"""
    # Вызов get_user_tasks с фильтрами
    # Возврат списка TaskResponse

@tasks_router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Создание новой задачи"""
    # Вызов create_task с user_id
    # Возврат TaskResponse

@tasks_router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Получение задачи по ID"""
    # Вызов get_task_by_id
    # Если не найдена - 404
    # Возврат TaskResponse

@tasks_router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Обновление задачи"""
    # Вызов update_task
    # Если не найдена - 404
    # Возврат TaskResponse

@tasks_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Удаление задачи"""
    # Вызов delete_task
    # Если не найдена - 404
    # Возврат None (204 No Content)
```

**Зависимости:**
- ✅ TaskCreate, TaskUpdate, TaskResponse из schemas/task.py
- ✅ get_task_service, get_current_user из dependencies.py (Фаза 3)
- ✅ TaskService (Фаза 2)

---

### Фаза 6: Тесты

#### 6.1 Unit тесты для AuthService

**Файл:** `tests/test_auth_service.py`

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest, LoginRequest
from app.models.user import User

@pytest.mark.asyncio
async def test_create_user_success(db_session: AsyncSession):
    """Успешное создание пользователя"""
    # Создание AuthService
    # Вызов create_user с валидными данными
    # Проверка: пользователь создан
    # Проверка: пароль захеширован
    # Проверка: is_active = True

@pytest.mark.asyncio
async def test_create_user_duplicate_username(db_session: AsyncSession):
    """Ошибка при дубликате username"""
    # Создание первого пользователя
    # Попытка создания второго с тем же username
    # Проверка: выбрасывается исключение

@pytest.mark.asyncio
async def test_create_user_duplicate_email(db_session: AsyncSession):
    """Ошибка при дубликате email"""
    # Создание первого пользователя
    # Попытка создания второго с тем же email
    # Проверка: выбрасывается исключение

@pytest.mark.asyncio
async def test_authenticate_user_success(db_session: AsyncSession):
    """Успешная аутентификация"""
    # Создание пользователя
    # Вызов authenticate_user с верными данными
    # Проверка: пользователь возвращен

@pytest.mark.asyncio
async def test_authenticate_user_wrong_password(db_session: AsyncSession):
    """Ошибка при неверном пароле"""
    # Создание пользователя
    # Вызов authenticate_user с неверным паролем
    # Проверка: возвращен None

@pytest.mark.asyncio
async def test_authenticate_user_not_found(db_session: AsyncSession):
    """Ошибка при несуществующем пользователе"""
    # Вызов authenticate_user с несуществующим username
    # Проверка: возвращен None

@pytest.mark.asyncio
async def test_create_tokens(db_session: AsyncSession):
    """Создание токенов"""
    # Создание пользователя
    # Вызов create_tokens
    # Проверка: access_token не пустой
    # Проверка: refresh_token не пустой
    # Проверка: access_token декодируется
    # Проверка: refresh_token декодируется

@pytest.mark.asyncio
async def test_get_user_by_id(db_session: AsyncSession):
    """Поиск пользователя по ID"""
    # Создание пользователя
    # Вызов get_user_by_id
    # Проверка: пользователь найден
    # Проверка: данные совпадают
```

#### 6.2 Unit тесты для TaskService

**Файл:** `tests/test_task_service.py`

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.task_service import TaskService
from app.schemas.task import TaskCreate, TaskUpdate
from app.models.user import User, Task
from uuid import uuid4

@pytest.mark.asyncio
async def test_create_task(db_session: AsyncSession, test_user: User):
    """Создание задачи"""
    # Создание TaskService
    # Вызов create_task
    # Проверка: задача создана
    # Проверка: user_id совпадает
    # Проверка: is_completed = False

@pytest.mark.asyncio
async def test_get_user_tasks_empty(db_session: AsyncSession, test_user: User):
    """Пустой список задач"""
    # Создание TaskService
    # Вызов get_user_tasks
    # Проверка: возвращен пустой список

@pytest.mark.asyncio
async def test_get_user_tasks_with_data(db_session: AsyncSession, test_user: User):
    """Список с задачами"""
    # Создание нескольких задач
    # Вызов get_user_tasks
    # Проверка: возвращен правильный список
    # Проверка: сортировка по created_at DESC

@pytest.mark.asyncio
async def test_get_user_tasks_filter_completed(db_session: AsyncSession, test_user: User):
    """Фильтрация по статусу"""
    # Создание задач с разным статусом
    # Вызов get_user_tasks с completed=True
    # Проверка: только завершенные
    # Вызов get_user_tasks с completed=False
    # Проверка: только активные

@pytest.mark.asyncio
async def test_get_task_by_id_success(db_session: AsyncSession, test_user: User, test_task: Task):
    """Поиск задачи по ID"""
    # Создание TaskService
    # Вызов get_task_by_id
    # Проверка: задача найдена
    # Проверка: данные совпадают

@pytest.mark.asyncio
async def test_get_task_by_id_not_owner(db_session: AsyncSession, test_user: User):
    """Поиск задачи другого пользователя"""
    # Создание другого пользователя
    # Создание задач для разных пользователей
    # Попытка получить чужую задачу
    # Проверка: возвращен None

@pytest.mark.asyncio
async def test_update_task(db_session: AsyncSession, test_user: User, test_task: Task):
    """Обновление задачи"""
    # Создание TaskService
    # Вызов update_task с новыми данными
    # Проверка: задача обновлена
    # Проверка: обновлены только переданные поля

@pytest.mark.asyncio
async def test_delete_task(db_session: AsyncSession, test_user: User, test_task: Task):
    """Удаление задачи"""
    # Создание TaskService
    # Вызов delete_task
    # Проверка: задача удалена из БД
    # Проверка: возвращен True

@pytest.mark.asyncio
async def test_toggle_task(db_session: AsyncSession, test_user: User, test_task: Task):
    """Переключение статуса"""
    # Создание TaskService
    # Вызов toggle_task
    # Проверка: is_completed инвертирован
    # Повторный вызов
    # Проверка: статус вернулся
```

#### 6.3 Integration тесты для API

**Файл:** `tests/test_api_auth.py`

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.mark.asyncio
async def test_register_success():
    """Успешная регистрация"""
    # POST /api/auth/register с валидными данными
    # Проверка: статус 201
    # Проверка: в ответе access_token и user
    # Проверка: refresh_token в cookie

@pytest.mark.asyncio
async def test_register_duplicate_username():
    """Дубликат username"""
    # Регистрация первого пользователя
    # Попытка регистрации с тем же username
    # Проверка: статус 400
    # Проверка: сообщение об ошибке

@pytest.mark.asyncio
async def test_register_duplicate_email():
    """Дубликат email"""
    # Регистрация первого пользователя
    # Попытка регистрации с тем же email
    # Проверка: статус 400
    # Проверка: сообщение об ошибке

@pytest.mark.asyncio
async def test_register_invalid_data():
    """Невалидные данные"""
    # POST /api/auth/register с коротким паролем
    # Проверка: статус 422 (validation error)

@pytest.mark.asyncio
async def test_login_success():
    """Успешный вход"""
    # Регистрация пользователя
    # POST /api/auth/login
    # Проверка: статус 200
    # Проверка: в ответе access_token и user
    # Проверка: refresh_token в cookie

@pytest.mark.asyncio
async def test_login_wrong_password():
    """Неверный пароль"""
    # Регистрация пользователя
    # POST /api/auth/login с неверным паролем
    # Проверка: статус 401

@pytest.mark.asyncio
async def test_login_not_found():
    """Несуществующий пользователь"""
    # POST /api/auth/login с несуществующим username
    # Проверка: статус 401

@pytest.mark.asyncio
async def test_refresh_success():
    """Успешное обновление токена"""
    # Регистрация и вход
    # POST /api/auth/refresh
    # Проверка: статус 200
    # Проверка: новый access_token
    # Проверка: новый refresh_token в cookie

@pytest.mark.asyncio
async def test_refresh_no_cookie():
    """Обновление без refresh token"""
    # POST /api/auth/refresh без cookie
    # Проверка: статус 401

@pytest.mark.asyncio
async def test_logout():
    """Выход"""
    # Регистрация и вход
    # POST /api/auth/logout
    # Проверка: статус 200
    # Проверка: refresh_cookie очищен

@pytest.mark.asyncio
async def test_get_me():
    """Получение текущего пользователя"""
    # Регистрация и вход
    # GET /api/auth/me с access_token
    # Проверка: статус 200
    # Проверка: данные пользователя совпадают

@pytest.mark.asyncio
async def test_get_me_unauthorized():
    """Доступ без токена"""
    # GET /api/auth/me без токена
    # Проверка: статус 401
```

**Файл:** `tests/test_api_tasks.py`

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers(client, username, password):
    """Вспомогательная функция для получения токена"""
    # POST /api/auth/login
    # Возврат headers с Authorization

@pytest.mark.asyncio
async def test_get_tasks_empty():
    """Пустой список задач"""
    # Регистрация и вход
    # GET /api/tasks с токеном
    # Проверка: статус 200
    # Проверка: пустой список

@pytest.mark.asyncio
async def test_create_task():
    """Создание задачи"""
    # Регистрация и вход
    # POST /api/tasks с данными
    # Проверка: статус 201
    # Проверка: возвращена задача

@pytest.mark.asyncio
async def test_get_tasks():
    """Получение списка задач"""
    # Регистрация и вход
    # Создание нескольких задач
    # GET /api/tasks
    # Проверка: статус 200
    # Проверка: все задачи возвращены

@pytest.mark.asyncio
async def test_get_task_by_id():
    """Получение задачи по ID"""
    # Регистрация и вход
    # Создание задачи
    # GET /api/tasks/{id}
    # Проверка: статус 200
    # Проверка: данные совпадают

@pytest.mark.asyncio
async def test_get_task_not_found():
    """Задача не найдена"""
    # Регистрация и вход
    # GET /api/tasks/{random_id}
    # Проверка: статус 404

@pytest.mark.asyncio
async def test_update_task():
    """Обновление задачи"""
    # Регистрация и вход
    # Создание задачи
    # PUT /api/tasks/{id} с новыми данными
    # Проверка: статус 200
    # Проверка: задача обновлена

@pytest.mark.asyncio
async def test_delete_task():
    """Удаление задачи"""
    # Регистрация и вход
    # Создание задачи
    # DELETE /api/tasks/{id}
    # Проверка: статус 204
    # Проверка: задача удалена

@pytest.mark.asyncio
async def test_get_tasks_unauthorized():
    """Доступ без авторизации"""
    # GET /api/tasks без токена
    # Проверка: статус 401

@pytest.mark.asyncio
async def test_create_task_unauthorized():
    """Создание без авторизации"""
    # POST /api/tasks без токена
    # Проверка: статус 401

@pytest.mark.asyncio
async def test_filter_tasks_completed():
    """Фильтрация завершенных задач"""
    # Регистрация и вход
    # Создание задач с разным статусом
    # GET /api/tasks?completed=true
    # Проверка: только завершенные

@pytest.mark.asyncio
async def test_filter_tasks_active():
    """Фильтрация активных задач"""
    # Регистрация и вход
    # Создание задач с разным статусом
    # GET /api/tasks?completed=false
    # Проверка: только активные
```

#### 6.4 Фикстуры для тестов

**Файл:** `tests/conftest.py`

```python
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models import Base
from app.database import get_db
from httpx import AsyncClient
from app.main import app

# Test database
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
    """Test client с переопределенной БД"""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
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
        password="testpassword123"
    ))
    await db_session.commit()
    return user

@pytest.fixture
async def test_task(db_session: AsyncSession, test_user):
    """Создание тестовой задачи"""
    from app.services.task_service import TaskService
    from app.schemas.task import TaskCreate

    service = TaskService(db_session)
    task = await service.create_task(
        user_id=test_user.id,
        data=TaskCreate(title="Test Task", description="Test Description")
    )
    await db_session.commit()
    return task
```

---

## Порядок реализации

### Итерация 1: Базовая функциональность (MVP)
1. ✅ Сервисный слой аутентификации (Фаза 1)
2. ✅ Auth Dependencies (Фаза 3)
3. ✅ Auth Endpoints: register, login, refresh (Фаза 4)
4. ✅ Сервисный слой задач (Фаза 2)
5. ✅ Task Endpoints: CRUD операции (Фаза 5)
6. ✅ Интеграционные тесты для API (Фаза 6.3)

### Итерация 2: Тестирование и улучшения
7. ✅ Unit тесты для AuthService (Фаза 6.1)
8. ✅ Unit тесты для TaskService (Фаза 6.2)
9. ✅ Фикстуры для тестов (Фаза 6.4)
10. ✅ Проверка покрытия тестами
11. ✅ Документация endpoints (OpenAPI/Swagger)

---

## Файлы для создания/изменения

### Новые файлы
- `app/services/auth_service.py`
- `app/services/task_service.py`
- `app/dependencies.py` (перезапись)
- `tests/conftest.py`
- `tests/test_auth_service.py`
- `tests/test_task_service.py`
- `tests/test_api_auth.py`
- `tests/test_api_tasks.py`

### Изменяемые файлы
- `app/api/auth.py` (замена заглушки на полную реализацию)
- `app/api/tasks.py` (замена заглушки на полную реализацию)
- `tests/__init__.py` (добавить пустой файл для тестов)

---

## Проверка реализации

После завершения каждой фазы проверить:

### Фаза 1
- [ ] AuthService.create_user() создает пользователя с хешированным паролем
- [ ] AuthService.authenticate_user() возвращает пользователя при верном пароле
- [ ] AuthService.create_tokens() генерирует валидные токены

### Фаза 2
- [ ] TaskService.create_task() создает задачу
- [ ] TaskService.get_user_tasks() возвращает список задач
- [ ] TaskService.update_task() обновляет задачу
- [ ] TaskService.delete_task() удаляет задачу

### Фаза 3
- [ ] get_current_user() декодирует токен и возвращает пользователя
- [ ] get_current_user() возвращает 401 при невалидном токене
- [ ] get_current_active_user() возвращает 400 при неактивном пользователе

### Фаза 4
- [ ] POST /api/auth/register возвращает 201 и токены
- [ ] POST /api/auth/login возвращает 200 и токены
- [ ] POST /api/auth/refresh обновляет токен
- [ ] POST /api/auth/logout очищает cookie
- [ ] GET /api/auth/me возвращает данные пользователя

### Фаза 5
- [ ] GET /api/tasks возвращает список задач
- [ ] POST /api/tasks создает задачу
- [ ] GET /api/tasks/{id} возвращает задачу
- [ ] PUT /api/tasks/{id} обновляет задачу
- [ ] DELETE /api/tasks/{id} удаляет задачу

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

### Вход
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpassword123"}' \
  -c cookies.txt
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

---

## Дополнительные улучшения (будущее)

1. **Rate limiting** - ограничение запросов для auth endpoints
2. **Email verification** - подтверждение email при регистрации
3. **Password reset** - восстановление пароля
4. **OAuth2** - вход через Google, GitHub и т.д.
5. **Task categories/tags** - категоризация задач
6. **Task priorities** - приоритеты задач
7. **Task due dates** - дедлайны
8. **Task subtasks** - подзадачи
9. **File attachments** - прикрепление файлов к задачам
10. **Real-time updates** - WebSockets для обновлений
11. **Notifications** - уведомления о задачах
12. **Sharing tasks** - совместный доступ к задачам
13. **Task history** - история изменений задач
14. **Export/Import** - экспорт и импорт задач
15. **Analytics** - аналитика по выполнению задач
