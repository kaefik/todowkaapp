# TodowkaApp — PWA Todo Application Design

**Date:** 2026-04-06
**Status:** Approved
**Stack:** Vite + React SPA / FastAPI / SQLite / Docker

## Overview

Offline-first PWA GTD task management application. Single user, multi-device sync. Full offline support for all operations (create, read, update, delete tasks, projects, contexts, areas, tags, subtasks).

## 1. High-Level Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + TypeScript |
| Routing | react-router v7 |
| State | Zustand (global) + Dexie live queries (data) |
| Server state | TanStack Query (optional, for sync status) |
| IndexedDB | Dexie.js |
| Styling | Tailwind CSS |
| Forms | react-hook-form + zod |
| PWA | vite-plugin-pwa (Workbox) |
| Backend | FastAPI + Uvicorn |
| ORM | SQLAlchemy + aiosqlite |
| DB | SQLite (file-based) |
| Background tasks | Celery + Redis |
| Real-time | SSE (sse-starlette) |
| Deploy | Docker Compose (VPS) |
| Reverse proxy | Nginx |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Docker Compose (VPS)                     │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │   Nginx         │  │   FastAPI         │  │  Redis     │  │
│  │   :80/:443      │  │   :8000           │  │  :6379     │  │
│  │                 │  │                    │  │            │  │
│  │  / → static/   │──│  /api/v1/* → app  │  │  Celery    │  │
│  │  (Vite build)  │  │                    │  │  broker    │  │
│  └─────────────────┘  └──────┬───────────┘  └────────────┘  │
│                              │                                │
│                       ┌──────┴───────┐                       │
│                       │  SQLite DB   │                       │
│                       │  (volume)    │                       │
│                       └──────────────┘                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Client (PWA)                              │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │ Vite + React│  │ Zustand     │  │  Service Worker      │ │
│  │ + Router    │  │ (state)     │  │  (Workbox)           │ │
│  │ + Tailwind  │  │             │  │  - Cache static      │ │
│  │             │  │             │  │  - Background Sync   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘ │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                ┌─────────┴──────────┐                       │
│                │    Dexie.js        │                       │
│                │    (IndexedDB)     │                       │
│                └────────────────────┘                       │
└──────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
todowkaapp/
├── client/                 # Vite + React PWA
│   ├── public/
│   │   └── icons/          # PWA icons (192x192, 512x512)
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Pages
│   │   ├── stores/         # Zustand stores
│   │   ├── db/             # Dexie.js schema + sync engine
│   │   ├── api/            # API client
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   └── sw/             # Service Worker logic
│   ├── index.html
│   ├── vite.config.ts
│   └── tailwind.config.ts
├── server/                 # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # Data access
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── core/           # Config, security, deps
│   ├── alembic/            # DB migrations
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── docs/
    └── plans/
```

## 2. Data & Sync Layer

### 2.1 Local Database Schema (IndexedDB via Dexie.js)

**Tables:**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `tasks` | Local task copy | `id` (UUID), `server_id`, `status`, `is_synced` |
| `projects` | Local project copy | `id` (UUID), `server_id`, `is_synced` |
| `contexts` | Local context copy | `id` (UUID), `server_id`, `is_synced` |
| `areas` | Local area copy | `id` (UUID), `server_id`, `is_synced` |
| `tags` | Local tag copy | `id` (UUID), `server_id`, `is_synced` |
| `subtasks` | Local subtask copy | `id` (UUID), `server_id`, `task_id`, `is_synced` |
| `notifications` | Local notification copy | `id` (UUID), `server_id`, `is_synced` |
| `pendingOps` | Queue of unsynced operations | `++id`, `entity_type`, `entity_id`, `operation`, `data`, `synced` |
| `syncMeta` | Sync metadata | `key`, `value` (last_sync_timestamp, device_id) |

**ID Strategy:** UUID on client → server_id assigned on sync.

```
Client creates task:
  id = "uuid-550e8400..."     (generated on client)
  server_id = null            (not yet synced)

After sync:
  id = "uuid-550e8400..."     (stays)
  server_id = 42              (assigned by server)
```

### 2.2 Sync Engine

**Triggers:**
- Online event (`navigator.onLine`)
- Background Sync API
- Manual sync button
- Periodic (every 5 min when online)
- SSE notification of remote change

**Sync Flow:**

```
1. Check if online
2. POST /api/v1/sync
   {
     device_id: "uuid-device-123",
     last_sync_timestamp: "2026-04-06T10:00:00Z",
     pending_ops: [
       { client_id, entity_type, operation, data }
     ]
   }
3. Server processes:
   - Apply pending_ops (per-field merge)
   - Collect server_changes since last_sync_timestamp
4. Response:
   {
     sync_timestamp,
     applied: [{ client_id, server_id }],
     conflicts: [],
     server_changes: [{ entity_type, operation, data }]
   }
5. Client processes:
   - Update IndexedDB with server_changes
   - Map server_id to local records
   - Clear synced pendingOps
   - Update last_sync_timestamp
```

### 2.3 Conflict Resolution: Per-field merge + LWW fallback

- Compare `updated_at` for each field independently
- If server field `updated_at` > local → take server value
- Otherwise → keep local value
- Track `version` number for each entity

### 2.4 Data Reading Strategy

UI **always** reads from IndexedDB. Server is only source of truth for sync.

```
UI requests data → Read from IndexedDB (instant, offline-ready)
                 → If online, trigger background sync
                 → Dexie live queries re-render React on update
```

## 3. UI/UX Structure

### 3.1 Routes

| Route | Page |
|-------|------|
| `/` | Dashboard (inbox count, today tasks, next actions) |
| `/login` | Login |
| `/register` | Registration |
| `/inbox` | Inbox (GTD Capture) |
| `/tasks` | All tasks (with filters) |
| `/tasks/:id` | Task detail |
| `/projects` | Project list |
| `/projects/:id` | Project detail + tasks |
| `/contexts` | Context management |
| `/areas` | Area management |
| `/tags` | Tag management |
| `/notifications` | Notification center |
| `/settings` | Settings (theme, sync, sessions) |
| `/settings/sessions` | Session management |
| `/review` | Weekly review (GTD Review) |

### 3.2 Layout

**Desktop (>= 1024px):** Sidebar + Header + Main content
**Mobile (< 1024px):** Header + Full-width content + Bottom navigation

### 3.3 Key Components

```
components/
├── ui/                      # Button, Input, Modal, Badge, Dropdown, Toast, Skeleton
├── layout/                  # AppShell, Sidebar, BottomNav, Header
├── task/                    # TaskList, TaskItem, TaskDetail, TaskForm, TaskFilters, QuickCapture, SubtaskList
├── project/                 # ProjectList, ProjectCard (with progress bar), ProjectForm
├── sync/                    # SyncIndicator (synced/syncing/offline), ConflictBanner
└── auth/                    # LoginForm, RegisterForm
```

### 3.4 PWA UI Elements

**SyncIndicator** — always visible in header:
- `✓ Everything synced` — online, all synced
- `⟳ Syncing...` — sync in progress
- `⚠ Offline` — no internet, changes saved locally
- `⚠ N changes pending sync` — has pending ops

**InstallPrompt** — offer to install PWA on first visit.

## 4. Backend API Modifications for Sync

### 4.1 New Endpoint: `POST /api/v1/sync`

**Request:**
```json
{
  "device_id": "uuid-device-123",
  "last_sync_timestamp": "2026-04-06T10:00:00Z",
  "pending_ops": [
    {
      "client_id": "uuid-task-550e",
      "entity_type": "task",
      "operation": "create",
      "data": { "title": "Buy milk", "status": "inbox", "priority": "medium" }
    },
    {
      "client_id": "uuid-task-772a",
      "entity_type": "task",
      "operation": "update",
      "server_id": 42,
      "data": { "title": "Buy milk 2%", "updated_at": "2026-04-06T11:00:00Z" }
    },
    {
      "client_id": "uuid-task-991b",
      "entity_type": "task",
      "operation": "delete",
      "server_id": 15
    }
  ]
}
```

**Response:**
```json
{
  "sync_timestamp": "2026-04-06T12:00:00Z",
  "applied": [
    { "client_id": "uuid-task-550e", "server_id": 101, "entity_type": "task", "operation": "create" }
  ],
  "conflicts": [],
  "server_changes": [
    { "id": 50, "entity_type": "task", "operation": "update", "data": { "title": "Wash car", "status": "completed" } }
  ]
}
```

### 4.2 Server Sync Logic

```
For each pending_op:
  CREATE → insert into DB, return server_id, save client_id→server_id mapping
  UPDATE → find by server_id, per-field merge by updated_at
  DELETE → soft delete (set deleted_at)

Collect server_changes:
  SELECT * FROM {entity} WHERE updated_at > last_sync_timestamp AND user_id = current_user
  Exclude just-applied operations

Return: applied[], conflicts[], server_changes[], sync_timestamp
```

### 4.3 Additional Database Tables

```sql
-- Client UUID → Server ID mapping
CREATE TABLE client_id_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    entity_type VARCHAR NOT NULL,
    client_id VARCHAR NOT NULL,
    server_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, entity_type, client_id)
);

-- Change log for sync
CREATE TABLE change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    entity_type VARCHAR NOT NULL,
    entity_id INTEGER NOT NULL,
    operation VARCHAR NOT NULL,
    changed_fields JSON,
    timestamp DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_change_log_sync ON change_log(user_id, timestamp);
```

### 4.4 Preserved API Endpoints

All standard CRUD endpoints from `todo-project-spec/API.md` are preserved:
- `/auth/*` — authentication (unchanged)
- `/tasks`, `/projects`, `/contexts`, `/areas`, `/tags` — CRUD (work directly, without sync)
- `/inbox` — quick capture
- `/notifications/*` — notifications + SSE stream
- `/health` — health check

Sync endpoint is **additive**. Client can use both:
- **Online:** direct CRUD for instant UI + sync for background
- **Offline:** everything via IndexedDB, sync when online

### 4.5 SSE + Sync Integration

Server pushes SSE events on entity changes. Client triggers incremental sync on SSE event.

## 5. Deployment & Docker

### 5.1 Docker Compose Services

| Service | Image | Purpose |
|---------|-------|---------|
| nginx | nginx:alpine | Static files + reverse proxy |
| api | custom (FastAPI) | REST API server |
| celery-worker | custom (FastAPI) | Background task processing |
| celery-beat | custom (FastAPI) | Scheduled tasks |
| redis | redis:7-alpine | Message broker for Celery |

### 5.2 Nginx Configuration

- Serves Vite static build
- Proxy `/api/` → FastAPI
- SSE support (no buffering, long timeout)
- SW and manifest — no cache
- `/assets/` — long cache (1 year)
- SPA fallback → `index.html`

### 5.3 PWA Manifest

```json
{
  "name": "TodowkaApp",
  "short_name": "Todowka",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "orientation": "any"
}
```

### 5.4 Environment Variables

```
SECRET_KEY=                 # JWT secret (min 32 chars)
REFRESH_TOKEN_HASH_KEY=     # Refresh token hash key (min 32 chars)
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
DATABASE_URL=sqlite:///./data/todowka.db
REDIS_URL=redis://redis:6379/0
```

### 5.5 Deployment Process

```bash
git clone <repo> && cd todowkaapp
cd client && npm install && npm run build
docker compose up -d --build
docker compose exec api python -m alembic upgrade head
```

## 6. Implementation Phases

### Phase 1: Foundation
- Project scaffolding (Vite + React + FastAPI)
- Docker Compose setup
- Database schema (SQLite + Alembic)
- User authentication (register, login, JWT)
- Basic API endpoints (tasks CRUD)

### Phase 2: PWA + Offline
- vite-plugin-pwa setup (Service Worker, manifest)
- Dexie.js local database
- IndexedDB schema
- UI reads from IndexedDB
- Pending operations queue

### Phase 3: Sync Engine
- `/api/v1/sync` endpoint
- Client sync engine
- Per-field merge + LWW conflict resolution
- Background Sync API
- SSE integration with sync

### Phase 4: GTD Features
- Inbox quick capture
- Task filtering and search
- Contexts, areas, tags CRUD
- GTD status workflow
- Subtasks

### Phase 5: Advanced Features
- Projects with progress tracking
- Recurring tasks
- Notifications + reminders
- SSE real-time notifications
- Weekly review

### Phase 6: Polish
- Session management
- Dark mode
- Keyboard shortcuts
- Mobile responsive optimization
- Testing
- Deployment
