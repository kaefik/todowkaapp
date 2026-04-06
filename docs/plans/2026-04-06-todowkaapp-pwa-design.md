# TodowkaApp — PWA Todo Application Design

**Date:** 2026-04-06
**Status:** Approved (after plan-critic round 1 fixes)
**Stack:** Vite + React SPA / FastAPI / SQLite / Docker
**Runtime:** Node.js 20 LTS, Python 3.12

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
| DB | SQLite (file-based, WAL mode for concurrent reads) |
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

### 2.2 Initial Data Load (First Login on New Device)

When a user logs in on a new device, IndexedDB is empty. Before the app is usable:

```
1. User logs in → POST /auth/login → tokens received
2. Client calls GET /api/v1/sync/full
3. Server returns ALL user data:
   {
     sync_timestamp: "2026-04-06T12:00:00Z",
     tasks: [...],
     projects: [...],
     contexts: [...],
     areas: [...],
     tags: [...],
     subtasks: [...],
     notifications: [...]
   }
4. Client stores everything in IndexedDB
5. Client saves sync_timestamp as last_sync_timestamp
6. App is ready (UI reads from IndexedDB)
```

### 2.3 Sync Engine

**Sync Triggers (with Safari/iOS fallback):**

| Trigger | Chrome/Edge | Safari/iOS | Notes |
|---------|-------------|------------|-------|
| `online` event | Yes | Yes | Primary trigger |
| Background Sync API | Yes | **No** | Chrome only |
| `visibilitychange` event | Yes | Yes | Sync when tab becomes visible |
| Periodic (5 min) | Yes | Yes | Fallback for all browsers |
| Manual sync button | Yes | Yes | User-initiated |
| SSE push notification | Yes | Yes | Phase 5 — triggers incremental sync |

**Sync Flow:**

```
1. Check if online
2. POST /api/v1/sync
   {
     device_id: "uuid-device-123",
     last_sync_timestamp: "2026-04-06T10:00:00Z",
     pending_ops: [
       { client_id, entity_type, operation, data, op_id: "uuid-op-unique" }
     ]
   }
3. Server processes pending_ops IN DEPENDENCY ORDER:
   1. areas (no dependencies)
   2. contexts (no dependencies)
   3. tags (no dependencies)
   4. projects (depend on areas)
   5. tasks (depend on projects, contexts, areas)
   6. subtasks (depend on tasks)
   
   For each op:
   - CREATE → insert, return server_id, save client_id→server_id mapping
   - UPDATE → entity-level LWW: compare updated_at, newer wins
   - DELETE → soft delete. Delete always wins over concurrent updates.
   
   Idempotency: each op has unique op_id. Server skips already-applied ops.
   
4. Collect server_changes:
   SELECT * FROM {entity} WHERE updated_at > last_sync_timestamp AND user_id = ?
   Exclude just-applied operations
   
5. Response:
   {
     sync_timestamp,
     applied: [{ client_id, server_id, op_id }],
     conflicts: [{ entity_type, server_data, local_data, reason }],
     server_changes: [{ entity_type, operation, data }]
   }

6. Client processes:
   - Apply server_changes to IndexedDB
   - Map server_id to local records (resolve client_id references)
   - Mark applied pendingOps as synced
   - Update last_sync_timestamp
   - If conflicts → show in UI (Phase 5+)
```

**Sync Error Handling:**
- Network error → retry with exponential backoff (1s, 2s, 4s, max 30s)
- 500 server error → retry up to 3 times, then pause 5 min
- 401 auth error → attempt token refresh, then re-auth if needed
- Timeout (>30s) → cancel, retry later
- Large pending ops (>100) → batch into chunks of 50

### 2.4 Conflict Resolution: Entity-level Last-Write-Wins (LWW)

Simplified from per-field merge to entity-level LWW for MVP:

- Each entity has one `updated_at` timestamp
- On conflict: compare `updated_at` — the newer one wins
- **Exception:** `delete` operations always win over `update` operations
- Track `version` number incremented on each change
- For single user this is sufficient — conflicts are rare (only when editing same entity on two devices offline)

Per-field merge can be added in a future iteration if needed.

### 2.5 Offline Authentication Strategy

Problem: JWT access token expires in 15 minutes. User may be offline for hours.

**Strategy: Local data access without auth, auth only for sync.**

```
Principle: IndexedDB data is ALREADY on the device. No need to authenticate
to read your own local data. Auth is only needed to communicate with server.

Flow:
1. On successful login → save auth state to IndexedDB (syncMeta table):
   { key: "auth_state", value: { user_id, email, logged_in_at } }
   
2. On app startup:
   - Check IndexedDB auth_state → if logged_in → show app (read from IndexedDB)
   - If NOT logged_in → show login page
   
3. For sync operations:
   - If access_token expired → attempt refresh (refresh_token in HttpOnly cookie)
   - If refresh fails (offline) → continue using local data
   - Show SyncIndicator: "⚠ Re-auth needed for sync"
   - When online again → prompt re-login if refresh fails
   
4. On logout:
   - Clear IndexedDB (all local data)
   - Clear auth_state
   - Redirect to login
```

**Key rule:** Local data is ALWAYS accessible. Authentication gates sync, not local access.

### 2.6 Data Reading Strategy

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

### 4.1 New Endpoint: `GET /api/v1/sync/full` — Initial Data Load

**Purpose:** Load all user data for initial IndexedDB population on new device.

**Request:**
```
GET /api/v1/sync/full
Cookie: access_token=...
```

**Response:**
```json
{
  "sync_timestamp": "2026-04-06T12:00:00Z",
  "tasks": [...],
  "projects": [...],
  "contexts": [...],
  "areas": [...],
  "tags": [...],
  "subtasks": [...],
  "notifications": [...]
}
```

### 4.2 New Endpoint: `GET /api/v1/sync/full` — Initial Full Load

Returns all user data for initial population of IndexedDB on a new device.

**Request:** `GET /api/v1/sync/full`
**Auth:** Required (JWT cookie)

**Response:** 200 OK
```json
{
  "sync_timestamp": "2026-04-06T12:00:00Z",
  "tasks": [...],
  "projects": [...],
  "contexts": [...],
  "areas": [...],
  "tags": [...],
  "subtasks": [...],
  "notifications": [...]
}
```

### 4.2 New Endpoint: `GET /api/v1/sync/full` — Initial Full Load

**Purpose:** Load all user data for first login on new device.

**Response:**
```json
{
  "sync_timestamp": "2026-04-06T12:00:00Z",
  "tasks": [{ "id": 1, "title": "...", ... }],
  "projects": [{ "id": 1, "name": "...", ... }],
  "contexts": [...],
  "areas": [...],
  "tags": [...],
  "subtasks": [...],
  "notifications": [...]
}
```

### 4.3 New Endpoint: `POST /api/v1/sync` — Incremental Sync

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

### 4.4 Server Sync Logic

```
Process pending_ops IN DEPENDENCY ORDER:
  1. areas      (no FK dependencies)
  2. contexts   (no FK dependencies)  
  3. tags       (no FK dependencies)
  4. projects   (FK: area_id → resolve client_id if needed)
  5. tasks      (FK: project_id, context_id, area_id → resolve client_ids)
  6. subtasks   (FK: task_id → resolve client_id if needed)

For each op:
  CREATE → insert, return server_id, save client_id→server_id mapping
           If data has client_id references (e.g. project_id = "uuid-xxx"),
           look up server_id from client_id_map
  UPDATE → entity-level LWW: 
           if op.data.updated_at > entity.updated_at → apply update
           if op.data.updated_at <= entity.updated_at → skip (server is newer)
  DELETE → soft delete (set deleted_at). Delete ALWAYS wins over update.
  
  Idempotency: check op_id. If already applied → skip, return previous result.

Collect server_changes:
  SELECT * FROM {entity} WHERE updated_at > last_sync_timestamp AND user_id = ?
  Exclude just-applied operations (by server_id)

Return: applied[], conflicts[], server_changes[], sync_timestamp
```

### 4.5 Additional Database Table

```sql
-- Client UUID → Server ID mapping (essential for sync)
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
```

Note: `change_log` table is NOT needed for entity-level LWW.
Server changes are collected by `WHERE updated_at > last_sync_timestamp` directly from entity tables.

All standard CRUD endpoints from `todo-project-spec/API.md` are preserved:
- `/auth/*` — authentication (unchanged)
- `/tasks`, `/projects`, `/contexts`, `/areas`, `/tags` — CRUD (work directly, without sync)
- `/inbox` — quick capture
- `/notifications/*` — notifications + SSE stream
- `/health` — health check

Sync endpoint is **additive**. Client can use both:
- **Online:** direct CRUD for instant UI + sync for background
- **Offline:** everything via IndexedDB, sync when online

### 4.7 SSE + Sync Integration (Phase 5)

Server pushes SSE events on entity changes. Client triggers incremental sync on SSE event.

Note: SSE is deferred to Phase 5. For MVP, sync relies on:
- Online event + periodic timer + visibilitychange + manual sync button

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
- Project scaffolding (Vite + React + FastAPI + Docker Compose)
- Database schema (SQLite + Alembic + WAL mode)
- User authentication (register, login, JWT + refresh tokens)
- Basic API endpoints (tasks CRUD)
- Basic frontend: login/register pages + task list + task form
- Nginx + Docker configuration

### Phase 2: GTD Features
- Inbox quick capture
- Task filtering, search, sorting
- Contexts, areas, tags CRUD
- GTD status workflow (inbox → active → completed → waiting → someday)
- Subtasks
- Projects with progress tracking
- Mobile responsive layout

### Phase 3: PWA + Offline
- vite-plugin-pwa setup (Service Worker, manifest, install prompt)
- Dexie.js local database schema
- UI reads from IndexedDB (Dexie live queries)
- Pending operations queue (write to IndexedDB + queue)
- SyncIndicator component
- Offline auth strategy (local access always available)

### Phase 4: Sync Engine
- `GET /api/v1/sync/full` — initial data load
- `POST /api/v1/sync` — incremental sync endpoint
- Client sync engine (triggers: online, visibilitychange, periodic, manual)
- Entity-level LWW conflict resolution
- Client_id → server_id mapping
- Dependency-ordered processing (areas → projects → tasks → subtasks)
- Error handling: retry, idempotency, batching
- Background Sync API (Chrome) + fallback (Safari/iOS)

### Phase 5: Advanced Features
- Recurring tasks (Celery beat + workers)
- Notifications + reminders
- SSE real-time notifications + SSE-triggered sync
- Weekly review workflow
- Session management (view/revoke sessions)

### Phase 6: Polish
- Dark mode
- Keyboard shortcuts
- Data export/import (JSON)
- Performance optimization
- Testing (unit + integration + E2E)
- Production deployment
- Monitoring & logging
