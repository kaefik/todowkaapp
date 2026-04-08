# Инструкции для AI-агентов (AGENTS.md)

Этот файл содержит инструкции для AI-агентов, работающих с репозиторием Todowka.

## Обязательные правила

### 1. Язык общения
- Взаимодействовать с пользователем на русском языке
- Отвечать четко, кратко и по делу
- Избегать лишней информации и введений

### 2. Документирование функциональности
- При добавлении новой функциональности ОБЯЗАТЕЛЬНО обновить файл `docs/features.md`
- Следовать формату документирования, описанному в `docs/features.md`
- Добавлять запись в соответствующую категорию возможных

## Проект Todowka

### Стек технологий

**Backend:**
- Python 3.12+ с async/await
- FastAPI для API
- SQLAlchemy 2.0 (async)
- SQLite с aiosqlite
- Alembic для миграций
- Pydantic v2 для валидации
- JWT аутентификация (python-jose)
- bcrypt для хеширования паролей

**Frontend:**
- React 18+ с TypeScript
- Vite 8.0.5
- React Router v7
- Zustand для состояния
- React Hook Form + Zod
- Tailwind CSS 4.2.2
- PWA (vite-plugin-pwa)

### Структура проекта

```
todowkaapp/
├── backend/                 # FastAPI бэкенд
│   ├── app/
│   │   ├── api/            # API роутеры
│   │   ├── models/         # SQLAlchemy модели
│   │   ├── schemas/        # Pydantic схемы
│   │   ├── services/       # Бизнес-логика
│   │   ├── config.py       # Конфигурация
│   │   ├── database.py     # Настройка БД
│   │   ├── dependencies.py # Зависимости FastAPI
│   │   ├── main.py         # Точка входа
│   │   └── security.py     # Безопасность
│   ├── alembic/            # Миграции
│   ├── tests/              # Тесты
│   ├── run.sh              # Скрипт запуска
│   └── pyproject.toml      # Зависимости
├── frontend/                # React фронтенд
│   ├── src/
│   │   ├── api/            # API клиент
│   │   ├── components/     # React компоненты
│   │   ├── hooks/          # Кастомные хуки
│   │   ├── routes/         # Страницы
│   │   ├── stores/         # Zustand сторы
│   │   └── main.tsx        # Точка входа
│   ├── run.sh              # Скрипт запуска
│   └── package.json        # Зависимости
├── docs/                    # Документация
│   └── features.md         # Список возможностей (ОБЯЗАТЕЛЬНО ОБНОВЛЯТЬ)
├── docker/                  # Docker конфигурация
└── tasks/                   # Задачи в формате Kanban
```

## Запуск проекта

### Backend
```bash
cd backend
./run.sh
```
Скрипт автоматически:
- Создает venv если нет
- Устанавливает зависимости
- Создает директорию data/
- Создает .env из .env.example
- Выполняет миграции
- Запускает сервер на http://localhost:8000

### Frontend
```bash
cd frontend
./run.sh
```
Скрипт автоматически:
- Устанавливает зависимости (с --legacy-peer-deps)
- Создает .env из .env.example
- Запускает Vite на http://localhost:5173

## Конвенции разработки

### Backend
- Использовать async/await везде
- Паттерн слоистой архитектуры: API → Services → Models
- Pydantic схемы для валидации данных
- SQLAlchemy 2.0 async для работы с БД
- Типизация функций с Python type hints

### Frontend
- TypeScript для типобезопасности
- React hooks для локального состояния
- Zustand для глобального состояния
- React Hook Form + Zod для форм
- Tailwind CSS для стилей

### Миграции БД
```bash
cd backend
# Создать новую миграцию
alembic revision --autogenerate -m "описание"

# Применить миграции
alembic upgrade head
```

## Тестирование

### Backend
```bash
cd backend
pytest tests/ -v
```

### Frontend
```bash
cd frontend
npm test
```

## Качество кода

### Backend
```bash
cd backend
# Линтер
ruff check .
# Форматирование
ruff check --fix .
# Проверка типов
ruff check --select I .
```

### Frontend
```bash
cd frontend
# Линтер
npm run lint
# Проверка типов
npx tsc --noEmit
```

## Важные файлы для обновления

При добавлении функциональности:
1. `docs/features.md` - ОБЯЗАТЕЛЬНО обновить
2. `backend/alembic/` - если изменяется схема БД
3. `README.md` - если нужны инструкции для пользователей
4. `.env.example` - если добавляются новые переменные окружения

## Контакт и поддержка

При работе с проектом:
- Отвечать на русском
- Быть кратким и конкретным
- Обновлять `docs/features.md` при добавлении функциональности
