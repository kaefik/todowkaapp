# Todowka

A full-stack Todo application with user authentication, task management, and PWA capabilities.

## Features

- User registration and authentication
- Task CRUD operations (Create, Read, Update, Delete)
- Responsive web UI
- Progressive Web App (PWA) support
- JWT-based authentication with refresh tokens
- SQLite database with async support

## Tech Stack

### Backend
- Python 3.12
- FastAPI
- SQLAlchemy 2.0 (async)
- aiosqlite
- Alembic
- Pydantic v2
- JWT (python-jose)
- bcrypt (passlib)

### Frontend
- React 18
- TypeScript
- Vite
- React Router v7
- Zustand (state management)
- Tailwind CSS
- react-hook-form
- zod (validation)
- vite-plugin-pwa

### Database
- SQLite with WAL mode

### Deployment
- Docker
- Docker Compose
- Nginx

### CI/CD
- GitHub Actions

## Prerequisites

- Docker
- Docker Compose

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd todowkaapp

# Start the application
docker-compose up --build

# Access the application
# Frontend: http://localhost
# API: http://localhost/api
```

## Environment Variables

### Backend
See `backend/.env.example` for all required environment variables.

### Frontend
See `frontend/.env.example` for all required environment variables.

## Development Setup

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Running Tests

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## Project Structure

```
todowkaapp/
├── backend/           # FastAPI backend
├── frontend/          # React frontend
├── docker/            # Docker configuration
├── .github/           # GitHub Actions CI/CD
├── tasks/             # Task management (Kanban)
└── docs/              # Documentation
```

## License

MIT
