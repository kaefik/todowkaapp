# Todowka

A modern, full-stack Todo application with user authentication, task management, and Progressive Web App (PWA) capabilities. Built as a monorepo with FastAPI backend, React frontend, SQLite database, and Docker deployment.

## Features

- **User Authentication**: Registration and login with JWT-based authentication
- **Task Management**: Full CRUD operations with GTD methodology (inbox, next actions, waiting, someday)
- **Projects**: Organize tasks into projects with automatic progress tracking
- **Contexts**: Assign contexts to tasks (Office, Home, Phone, etc.)
- **Areas**: Group tasks and projects by areas of responsibility
- **Tags**: Multi-select color-coded tags with M:N relationship to tasks
- **Subtasks**: Hierarchical task structure with progress indicators
- **Search & Filters**: Full-text search, combined filters, sorting, URL state sync
- **Refresh Tokens**: Secure token rotation with HttpOnly cookies
- **Responsive UI**: Clean, mobile-friendly interface with sidebar navigation
- **PWA Support**: Installable as a desktop/mobile app with offline capabilities
- **Real-time Updates**: Instant UI updates using React state management
- **Type Safety**: Full TypeScript support on frontend, Python type hints on backend

## Tech Stack

### Backend
- **Python 3.12** with async/await support
- **FastAPI** for high-performance API
- **SQLAlchemy 2.0** with async support
- **aiosqlite** for SQLite async driver
- **Alembic** for database migrations
- **Pydantic v2** for data validation
- **python-jose** for JWT handling
- **passlib** with bcrypt for password hashing

### Frontend
- **React 18** with hooks
- **TypeScript** for type safety
- **Vite** for fast development and building
- **React Router v7** for navigation
- **Zustand** for lightweight state management
- **Tailwind CSS** for utility-first styling
- **react-hook-form** for form handling
- **zod** for schema validation
- **vite-plugin-pwa** for PWA features

### Database
- **SQLite** with WAL mode for better concurrency
- Async database operations throughout

### Deployment
- **Docker** for containerization
- **Docker Compose** for multi-container orchestration
- **Nginx** as reverse proxy

### CI/CD
- **GitHub Actions** for continuous integration
- Automated linting, type checking, and testing

## Prerequisites

- **Docker** (version 20.10 or later)
- **Docker Compose** (version 2.0 or later)

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd todowkaapp

# Start the application
docker-compose up --build

# Access the application
# Frontend: http://localhost
# API: http://localhost/api
# API Documentation: http://localhost/api/docs
```

The application will be available at `http://localhost` after the build completes.

### Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (also deletes database)
docker-compose down -v
```

## Environment Variables

### Backend

Copy `backend/.env.example` to `backend/.env` and configure the following variables:

```bash
# Database Configuration
DATABASE_URL=sqlite+aiosqlite:///./data/todowka.db

# Security Configuration
SECRET_KEY=changeme-generate-random-string-64-characters

# JWT Token Expiration
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# User Registration
REGISTRATION_ENABLED=true
# INVITE_CODE=your-secret-invite-code

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:80,https://yourdomain.com

# Application Environment
APP_ENV=development
LOG_LEVEL=info
```

**Important**: Generate a secure `SECRET_KEY` for production. You can use:
```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### Frontend

Copy `frontend/.env.example` to `frontend/.env` and configure:

```bash
# API base URL
VITE_API_BASE_URL=/api

# Application name
VITE_APP_NAME=Todowka
```

**Note**: Frontend environment variables must start with `VITE_` to be accessible in the browser.

## Development Setup

### Backend Development

#### Quick Start with Auto-Setup Script (Recommended)

The `run.sh` script automates the entire backend setup and startup process:

```bash
cd backend

# Make the script executable (first time only)
chmod +x run.sh

# Run the script
./run.sh
```

**What the script does:**
- Creates a virtual environment if it doesn't exist
- Installs/updates all dependencies from `pyproject.toml`
- Creates the `data/` directory for the database
- Creates `.env` file from `.env.example` if it doesn't exist
- Runs database migrations automatically
- Starts the FastAPI development server

The script will handle all setup steps and launch the server at `http://localhost:8000`.

#### Manual Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e .

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/api/docs`.

### Frontend Development

#### Quick Start with Auto-Setup Script (Recommended)

The `run.sh` script automates the entire frontend setup and startup process:

```bash
cd frontend

# Make the script executable (first time only)
chmod +x run.sh

# Run the script
./run.sh
```

**What the script does:**
- Installs/updates all npm dependencies
- Creates `.env` file from `.env.example` if it doesn't exist
- Starts the Vite development server with hot reload

The script will handle all setup steps and launch the frontend at `http://localhost:5173`.

#### Manual Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v
```

### Frontend Tests

```bash
cd frontend

# Run tests in watch mode
npm test

# Run tests once
npm test -- --run

# Run tests with coverage
npm test -- --coverage
```

## Code Quality

### Backend

```bash
cd backend

# Run linter
ruff check .

# Fix linting issues automatically
ruff check --fix .

# Run type checker
mypy . --ignore-missing-imports

# Check import sorting
ruff check --select I .
```

### Frontend

```bash
cd frontend

# Run linter
npm run lint

# Fix linting issues automatically
npm run lint -- --fix

# Run type checker
npx tsc --noEmit
```

## CI/CD

The project uses GitHub Actions for continuous integration. The CI pipeline runs on:

- **Push to main branch**
- **Pull requests to main branch**

### CI Pipeline Steps

**Backend Job:**
1. Checkout code
2. Set up Python 3.12
3. Install dependencies (with pip caching)
4. Run linter (ruff check)
5. Run type checker (mypy)
6. Run tests (pytest)

**Frontend Job:**
1. Checkout code
2. Set up Node.js 20
3. Install dependencies (with npm caching)
4. Run linter (eslint)
5. Run type checker (tsc --noEmit)
6. Run tests (vitest)
7. Run build (npm run build)

Both jobs run in parallel for faster feedback.

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`

### Main API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (clears refresh cookie)
- `GET /api/auth/me` - Get current user info

**Tasks:**
- `GET /api/tasks` - List tasks (with pagination, filters, search, sorting)
- `POST /api/tasks` - Create new task
- `GET /api/tasks/{id}` - Get single task
- `PUT /api/tasks/{id}` - Update task
- `PATCH /api/tasks/{id}/toggle` - Toggle task completion
- `PATCH /api/tasks/{id}/move` - Move task to another GTD status
- `PATCH /api/tasks/{id}/reorder` - Change task position
- `DELETE /api/tasks/{id}` - Delete task
- `GET /api/tasks/counts` - Get GTD status counts
- `GET /api/tasks/{id}/subtasks` - List subtasks
- `POST /api/tasks/{id}/subtasks` - Create subtask

**Contexts:**
- `GET /api/contexts` - List contexts
- `POST /api/contexts` - Create context
- `GET /api/contexts/{id}` - Get context
- `PUT /api/contexts/{id}` - Update context
- `DELETE /api/contexts/{id}` - Delete context

**Areas:**
- `GET /api/areas` - List areas
- `POST /api/areas` - Create area
- `GET /api/areas/{id}` - Get area
- `PUT /api/areas/{id}` - Update area
- `DELETE /api/areas/{id}` - Delete area

**Tags:**
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag
- `GET /api/tags/{id}` - Get tag
- `PUT /api/tags/{id}` - Update tag
- `DELETE /api/tags/{id}` - Delete tag
- `POST /api/tags/tasks/{task_id}/tags/{tag_id}` - Add tag to task
- `DELETE /api/tags/tasks/{task_id}/tags/{tag_id}` - Remove tag from task

**Projects:**
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project (with progress)
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `GET /api/projects/{id}/tasks` - List project tasks

**Stats & Config:**
- `GET /api/stats` - Task statistics
- `GET /api/config` - App configuration

## Project Structure

```
todowkaapp/
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/            # API routers
│   │   │   ├── auth.py     # Authentication endpoints
│   │   │   ├── router.py   # Main API router
│   │   │   ├── tasks.py    # Task endpoints (CRUD, move, toggle, subtasks)
│   │   │   ├── contexts.py # Context endpoints
│   │   │   ├── areas.py    # Area endpoints
│   │   │   ├── tags.py     # Tag endpoints
│   │   │   ├── projects.py # Project endpoints
│   │   │   ├── users.py    # User management (admin)
│   │   │   └── stats.py    # Statistics endpoint
│   │   ├── models/         # SQLAlchemy ORM models
│   │   │   ├── task.py     # Task model (GTD fields, subtasks)
│   │   │   ├── user.py     # User model
│   │   │   ├── context.py  # Context model
│   │   │   ├── area.py     # Area model
│   │   │   ├── tag.py      # Tag model + task_tags
│   │   │   └── project.py  # Project model
│   │   ├── schemas/        # Pydantic schemas
│   │   │   ├── auth.py     # Auth schemas
│   │   │   ├── task.py     # Task schemas (Create/Update/Response)
│   │   │   ├── context.py  # Context schemas
│   │   │   ├── area.py     # Area schemas
│   │   │   ├── tag.py      # Tag schemas
│   │   │   └── project.py  # Project schemas (with progress)
│   │   ├── services/       # Business logic
│   │   │   ├── task_service.py
│   │   │   ├── context_service.py
│   │   │   ├── area_service.py
│   │   │   ├── tag_service.py
│   │   │   └── project_service.py
│   │   ├── config.py       # Application configuration
│   │   ├── database.py     # Database setup
│   │   ├── dependencies.py # FastAPI dependencies
│   │   ├── main.py         # Application entry point
│   │   └── security.py     # Security utilities
│   ├── alembic/            # Database migrations
│   ├── tests/              # Backend tests (174 tests)
│   ├── data/               # SQLite database (created at runtime)
│   ├── pyproject.toml      # Python dependencies
│   └── .env.example        # Environment variables template
│
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── api/            # API client
│   │   │   ├── httpClient.ts
│   │   │   └── users.ts
│   │   ├── components/     # React components
│   │   │   ├── AppLayout.tsx      # Layout + Sidebar
│   │   │   ├── InstallPrompt.tsx  # PWA install prompt
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── TaskEditModal.tsx  # Extended task form
│   │   │   └── TaskFilterPanel.tsx # Search + filters + sort
│   │   ├── hooks/          # Custom React hooks
│   │   │   ├── useTasks.ts       # Task CRUD + filters
│   │   │   ├── useContexts.ts    # Context CRUD
│   │   │   ├── useAreas.ts       # Area CRUD
│   │   │   ├── useTags.ts        # Tag CRUD
│   │   │   ├── useProjects.ts    # Project CRUD
│   │   │   ├── useSubtasks.ts    # Subtask CRUD
│   │   │   ├── useGtdCounts.ts   # GTD status counts
│   │   │   ├── useTaskFilter.ts  # Filter state + URL sync
│   │   │   └── useDebounce.ts
│   │   ├── routes/         # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── GtdTaskList.tsx  # Universal GTD list
│   │   │   ├── Projects.tsx     # Project cards + progress
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── Contexts.tsx
│   │   │   ├── Areas.tsx
│   │   │   ├── Tags.tsx
│   │   │   ├── Profile.tsx
│   │   │   └── Settings.tsx
│   │   ├── stores/         # Zustand stores
│   │   │   └── authStore.ts
│   │   ├── router.tsx      # React Router config
│   │   └── main.tsx        # Entry point
│   ├── public/             # Static assets
│   │   └── manifest.json   # PWA manifest
│   ├── package.json        # Node dependencies
│   ├── vite.config.ts      # Vite configuration
│   ├── vitest.config.ts    # Test configuration
│   └── .env.example        # Environment variables template
│
├── docs/                    # Documentation
│   ├── features.md         # Feature tracking
│   └── plans/              # Implementation plans
│
├── docker/                  # Docker configuration
│   ├── docker-compose.yml  # Multi-container setup
│   ├── nginx.conf          # Nginx reverse proxy
│   └── .env.example        # Docker environment variables
│
├── .github/
│   └── workflows/
│       ├── ci.yml          # CI: lint + typecheck + test
│       └── deploy.yml      # CD: deploy to production
│
├── .gitignore              # Git ignore rules
├── README.md               # This file
└── LICENSE                 # License file
```

## Architecture

### Backend Architecture
- **Layered Architecture**: Separation of concerns with API, Services, Models, and Schemas layers
- **Dependency Injection**: FastAPI's dependency system for database sessions and authentication
- **Async/Await**: All I/O operations use async patterns for better performance
- **JWT Authentication**: Access tokens in memory, refresh tokens in HttpOnly cookies
- **ORM**: SQLAlchemy 2.0 with async support for database operations

### Frontend Architecture
- **Component-Based**: Reusable React components with TypeScript
- **State Management**: Zustand for global state (auth), React hooks for local state
- **Routing**: React Router v7 for navigation
- **API Client**: Custom fetch wrapper with automatic token refresh
- **Form Handling**: react-hook-form with zod validation
- **Styling**: Tailwind CSS for utility-first styling

## Security

- **Password Hashing**: bcrypt with salt for secure password storage
- **JWT Tokens**: Signed with HS256 algorithm, configurable expiration
- **Refresh Tokens**: Stored in HttpOnly, Secure, SameSite=Strict cookies
- **CORS**: Configured to allow only specified origins
- **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries
- **XSS Protection**: React's built-in escaping and Content Security Policy

## PWA Features

- **Installable**: Can be installed on desktop and mobile devices
- **Offline Support**: Service worker caches static assets and API responses
- **Push Notifications**: Ready for push notification integration
- **App Manifest**: Configured with app icons, colors, and display mode
- **Responsive Design**: Optimized for all screen sizes

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Acknowledgments

- Built with modern web technologies
- Inspired by the need for a simple, yet powerful todo application
- Thanks to the open-source community for the amazing tools and libraries
