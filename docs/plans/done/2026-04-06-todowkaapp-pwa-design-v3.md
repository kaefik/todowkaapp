# TodowkaApp — PWA Todo Application Design

**Date:** 2026-04-06
**Revised:** 2026-04-06 (plan-critic round 5 — removed Celery/Redis, added registration guard, SQL indexes, sync fixes)
**Status:** Approved
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
| Sync status | Zustand store (sync status: idle / syncing / error / offline) |
| IndexedDB | Dexie.js |
| Styling | Tailwind CSS |
| Forms | react-hook-form + zod |
| PWA | vite-plugin-pwa (Workbox) |
| Backend | FastAPI + Uvicorn |
| ORM | SQLAlchemy + aiosqlite |
| DB | SQLite (file-based, WAL mode for concurrent reads) |
| Background tasks | APScheduler (in-process, asyncio) *(added in Phase 5)* |
| Real-time | SSE (sse-starlette) *(added in Phase 5)* |
| Deploy | Docker Compose (VPS) |
| Reverse proxy | Nginx |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Docker Compose (VPS)                     │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │   Nginx         │  │   FastAPI + APScheduler           │  │
│  │   :80/:443      │  │   :8000                           │  │
│  │                 │  │                                    │  │
│  │  / → static/   │──│  /api/v1/* → app                  │  │
│  │  (Vite build)  │  │  scheduled jobs (in-process)       │  │
│  └─────────────────┘  └──────┬───────────────────────────┘  │
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
| `pendingOps` | Queue of unsynced operations | `++id`, `op_id` (UUID, unique), `entity_type`, `entity_id`, `operation`, `data`, `is_synced`, `created_at` |
| `syncMeta` | Sync metadata | `key`, `value` (last_sync_timestamp, device_id, auth_state, sync_in_progress) |

> **`pendingOps` cleanup:** After each successful sync, delete all records where `is_synced = true AND created_at < now() - 7 days`. This prevents unbounded growth while keeping recent history for debugging.

**ID Strategy:** UUID on client → server_id assigned on sync.

```
Client creates task:
  id = "uuid-550e8400..."     (generated on client)
  server_id = null            (not yet synced)

After sync:
  id = "uuid-550e8400..."     (stays)
  server_id = 42              (assigned by server)
```

### 2.1.1 Server Database Schema (SQLite)

**Enum-like values used across tables:**
- `task_status`: `inbox` | `active` | `completed` | `waiting` | `someday`
- `task_priority`: `low` | `medium` | `high`
- `notification_type`: `reminder` | `system` | `due_date`

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

> **Single-user registration guard:** The `/auth/register` endpoint checks the total user count before creating a new account. If a user already exists, registration is rejected with `403 Forbidden`. Controlled by the `ALLOW_REGISTRATION` env var (default `true`; set to `false` after first user is created, or use the user count check alone).
>
> ```python
> # server/app/routes/auth.py
> @router.post("/register")
> async def register(data: RegisterSchema, db: AsyncSession = Depends(get_db)):
>     if not settings.ALLOW_REGISTRATION:
>         raise HTTPException(403, "Registration is closed")
>     user_count = await db.scalar(select(func.count(User.id)))
>     if user_count >= 1:
>         raise HTTPException(403, "This instance already has a user")
>     # ... proceed with registration
> ```

CREATE TABLE areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    color VARCHAR(7) DEFAULT '#6B7280',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, name)
);

CREATE TABLE contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50) DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, name)
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, name)
);

CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    area_id INTEGER DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    color VARCHAR(7) DEFAULT '#2563EB',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    due_date DATE DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
);

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_id INTEGER DEFAULT NULL,
    context_id INTEGER DEFAULT NULL,
    area_id INTEGER DEFAULT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'inbox',
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    due_date DATE DEFAULT NULL,
    due_time TIME DEFAULT NULL,
    reminder_at DATETIME DEFAULT NULL,
    estimated_minutes INTEGER DEFAULT NULL,
    recurrence_rule TEXT DEFAULT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    completed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    server_received_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
);

CREATE TABLE task_tags (
    task_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER DEFAULT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'system',
    title VARCHAR(255) NOT NULL,
    body TEXT DEFAULT '',
    is_read BOOLEAN NOT NULL DEFAULT 0,
    scheduled_at DATETIME DEFAULT NULL,
    sent_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE TABLE refresh_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(500) DEFAULT '',
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Indexes ───────────────────────────────────────────────────────────────
-- Required for sync query: WHERE updated_at > last_sync_timestamp
CREATE INDEX idx_tasks_updated_at      ON tasks(user_id, updated_at);
CREATE INDEX idx_projects_updated_at   ON projects(user_id, updated_at);
CREATE INDEX idx_areas_updated_at      ON areas(user_id, updated_at);
CREATE INDEX idx_contexts_updated_at   ON contexts(user_id, updated_at);
CREATE INDEX idx_tags_updated_at       ON tags(user_id, updated_at);
CREATE INDEX idx_subtasks_updated_at   ON subtasks(user_id, updated_at);
CREATE INDEX idx_notifications_updated_at ON notifications(user_id, updated_at);

-- FK traversal indexes
CREATE INDEX idx_tasks_project_id      ON tasks(project_id);
CREATE INDEX idx_tasks_context_id      ON tasks(context_id);
CREATE INDEX idx_subtasks_task_id      ON subtasks(task_id);
CREATE INDEX idx_projects_area_id      ON projects(area_id);

-- Idempotency check
CREATE INDEX idx_applied_ops_op_id     ON applied_ops(op_id);
```

> **`server_received_at`** on `tasks`: stored but unused in MVP (LWW uses client `updated_at`). Available for future server-authoritative conflict resolution without schema migration. Apply to all entity tables if needed later.

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
| Background Sync API | Yes | **No** | Chrome only — registers `sync` event in SW, which triggers sync engine |
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
    - Apply server_changes to IndexedDB (single Dexie transaction per entity type to avoid UI thrashing from live queries)
    - Map server_id to local records (resolve client_id references)
    - Mark applied pendingOps as synced
    - Update last_sync_timestamp
    - If conflicts → show in UI (Phase 5+)
    
    Sync mutex: only one sync at a time. If sync already in progress, skip trigger.

 7. Cleanup (after step 6 completes):
    ```javascript
    await db.pendingOps
        .where('is_synced').equals(1)
        .and(op => op.created_at < Date.now() - 7 * 24 * 60 * 60 * 1000)
        .delete();
    ```
    Run after every successful sync. Prevents unbounded IndexedDB growth while keeping recent history for debugging.
```

**Sync Error Handling:**
- Network error → retry with exponential backoff (1s, 2s, 4s, max 30s)
- 500 server error → retry up to 3 times, then pause 5 min
- 401 auth error → attempt token refresh, then re-auth if needed
- Timeout (>30s) → cancel, retry later
- Large pending ops (>100) → batch into chunks of 50
- Server payload limits → max 100 pending_ops per request, max 10KB per op.data

**Edge Cases:**
- User clears browser data → treat as new device → login → full sync
- IndexedDB quota exceeded → catch `QuotaExceededError`, show error: "Storage full. Sync to server and clear local data?"
- Dexie schema version mismatch → trigger full re-sync (version tracked in syncMeta `dexie_schema_version`)
- Service Worker update → show "Update available" banner with reload button, never force-reload
- **`sync_in_progress` stale flag:** If the app crashes during full sync, `sync_in_progress` stays `true` permanently. On app startup, check: if `sync_in_progress = true` AND `sync_started_at < now() - 5 minutes` → reset flag and re-trigger full sync.

```javascript
// db/syncMeta.ts — called on app startup before rendering
async function recoverStaleSyncFlag() {
    const meta = await db.syncMeta.get('sync_in_progress');
    if (meta?.value === true) {
        const started = await db.syncMeta.get('sync_started_at');
        const staleTimeout = 5 * 60 * 1000; // 5 min
        if (!started || Date.now() - new Date(started.value).getTime() > staleTimeout) {
            await db.syncMeta.bulkPut([
                { key: 'sync_in_progress', value: false },
                { key: 'last_sync_timestamp', value: null }, // force full re-sync
            ]);
        }
    }
}
```

### 2.4 Conflict Resolution: Entity-level Last-Write-Wins (LWW)

Simplified from per-field merge to entity-level LWW for MVP:

- Each entity has one `updated_at` timestamp
- On conflict: compare `updated_at` — the newer one wins
- **Exception:** `delete` operations always win over `update` operations
- For single user this is sufficient — conflicts are rare (only when editing same entity on two devices offline)

Per-field merge can be added in a future iteration if needed.

> ⚠️ **Clock skew risk:** LWW depends on `updated_at` set by the client. If a device clock is skewed, newer changes may lose. Known MVP limitation. Future mitigation: use server-authoritative `server_received_at` for conflict resolution.

### 2.5 Offline Authentication Strategy

Problem: JWT access token expires in 15 minutes. User may be offline for hours.

**Strategy: Local data access without auth, auth only for sync.**

**Token Storage:**
- **Access token (JWT):** stored **in-memory only** (Zustand `authStore`). NOT in localStorage or cookies. Lost on page reload — this is intentional (XSS protection).
- **Refresh token:** stored as **HttpOnly cookie** (set by server on login/refresh). Not accessible to JS.
- **Auth state:** persisted in IndexedDB (`syncMeta` table) — `user_id`, `email`, `logged_in_at`. Used to determine if user was previously logged in (survives page reload).

```
Principle: IndexedDB data is ALREADY on the device. No need to authenticate
to read your own local data. Auth is only needed to communicate with server.

Flow:
1. On successful login → 
   - Server sets HttpOnly cookie with refresh_token
   - Server returns access_token in response body
   - Client stores access_token in-memory (Zustand authStore)
   - Client saves auth state to IndexedDB (syncMeta table):
     { key: "auth_state", value: { user_id, email, logged_in_at } }
    
2. On app startup:
   - Check IndexedDB auth_state → if logged_in → 
     a. Attempt refresh: POST /auth/refresh (HttpOnly cookie sent automatically)
     b. If refresh succeeds → new access_token in memory → show app
     c. If refresh fails (expired/offline) → show app from local data, show SyncIndicator "⚠ Re-auth needed for sync"
   - If NOT logged_in → show login page
    
3. For sync operations:
   - If access_token expired → attempt refresh (HttpOnly cookie)
   - If refresh fails (offline) → continue using local data
   - Show SyncIndicator: "⚠ Re-auth needed for sync"
   - When online again → prompt re-login if refresh fails
    
4. On logout:
   - Clear IndexedDB (all local data)
   - Clear auth_state
   - Clear in-memory access_token
   - POST /auth/logout (clear HttpOnly cookie)
   - Redirect to login
```

**Key rule:** Local data is ALWAYS accessible. Authentication gates sync, not local access.

> ⚠️ **iOS Safari standalone mode:** When a PWA is installed to the home screen on iOS, Safari runs it in a separate browser context — cookies (including HttpOnly refresh token) may not be shared with the main browser session. This means the user may need to log in again after installing the PWA. Known limitation; test explicitly on iOS before Phase 4 release.

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
├── sync/                    # SyncIndicator (synced/syncing/offline), ConflictBanner *(Phase 5)*
└── auth/                    # LoginForm, RegisterForm
```

### 3.4 PWA UI Elements

**SyncIndicator** — always visible in header:
- `✓ Everything synced` — online, all synced
- `⟳ Syncing...` — sync in progress
- `⚠ Offline` — no internet, changes saved locally
- `⚠ N changes pending sync` — has pending ops
- `⚠ Re-auth needed for sync` — refresh token expired, local data still accessible

**InstallPrompt** — offer to install PWA on first visit.

### 3.5 Error Handling Strategy

**React Error Boundaries:** Route-level error boundaries. Uncaught render errors → fallback UI with "Something went wrong" message and retry button. Prevents single component failure from crashing the entire app.

**Dexie errors:** Catch in data hooks. Show toast notification: "Local storage error. Try refreshing the page."

**Network errors:** Handled by sync engine (§2.3 error handling). Never block UI.

### 3.6 CORS Strategy

**Production:** Same-origin deployment. Nginx serves static files and proxies `/api/` to FastAPI. No CORS configuration needed.

**Development:** Vite dev server proxies API requests via `vite.config.ts`:
```ts
server: {
  proxy: {
    '/api': 'http://localhost:8000',
    '/auth': 'http://localhost:8000',
  }
}
```
No CORS headers needed in either environment.

## 4. Backend API Modifications for Sync

### 4.1 New Endpoint: `GET /api/v1/sync/full` — Initial Full Load

Returns all user data for initial population of IndexedDB on a new device.

**Request:** `GET /api/v1/sync/full`
**Auth:** Required (JWT cookie)

**Response:** 200 OK
```json
{
  "sync_timestamp": "2026-04-06T12:00:00Z",
  "tasks": [{ "id": 1, "title": "Buy milk", "status": "inbox", "tag_server_ids": [3, 7], "..." : "..." }],
  "projects": [{ "id": 1, "name": "Home", "..." : "..." }],
  "contexts": [...],
  "areas": [...],
  "tags": [...],
  "subtasks": [...],
  "notifications": [...]
}
```

> ⚠️ **Scale note:** No pagination for MVP. Acceptable up to ~2 000 tasks (tested). If `tasks` count exceeds 2 000, consider chunked loading. Client writes to IndexedDB per-table (each entity type in its own Dexie transaction) to avoid memory pressure on mobile. Guard with `sync_in_progress` flag in `syncMeta` — UI shows loading spinner during initial load, preventing reads of partial data.

> **Soft-delete rule:** `/sync/full` returns **only non-deleted entities** (`deleted_at IS NULL`). Soft-deleted records are excluded — a new device never needs them. Deleted entities are communicated only via incremental sync `server_changes` (operation: `"delete"`).

### 4.2 New Endpoint: `POST /api/v1/sync` — Incremental Sync

**Request:**
```json
{
  "device_id": "uuid-device-123",
  "last_sync_timestamp": "2026-04-06T10:00:00Z",
  "pending_ops": [
    {
      "op_id": "uuid-op-a1b2",
      "client_id": "uuid-task-550e",
      "entity_type": "task",
      "operation": "create",
      "data": { "title": "Buy milk", "status": "inbox", "priority": "medium", "tag_ids": ["uuid-tag-work"] }
    },
    {
      "op_id": "uuid-op-c3d4",
      "client_id": "uuid-task-772a",
      "entity_type": "task",
      "operation": "update",
      "server_id": 42,
      "data": { "title": "Buy milk 2%", "updated_at": "2026-04-06T11:00:00Z" }
    },
    {
      "op_id": "uuid-op-e5f6",
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

### 4.3 Server Sync Logic

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

### 4.4 Tag-Tasks Relationship (task_tags junction table)

The `task_tags` table is a many-to-many junction table on the server. On the client:

- Tags are stored as `tag_ids: string[]` (local UUIDs) on each task in IndexedDB
- When creating/updating a task, `tag_ids` is included in the task data
- Server manages the junction table automatically:
  - On task sync: server reads `tag_ids` from request, resolves client_ids → server_ids, updates `task_tags`
  - On full load: server includes `tag_ids` as `tag_server_ids: number[]` on each task
- Tags themselves are synced as independent entities

### 4.5 Notifications Sync

Notifications are **server-to-client only**:
- Server creates notifications (via APScheduler for reminders)
- Client receives them via sync (not creates them)
- Client can only mark notifications as `read` (sent as pending_op with `operation: "update"`)

### 4.6 Additional Database Table (client_id_map)

Maps client-generated UUIDs to server-assigned integer IDs. Required for resolving FK references during sync.

```sql
CREATE TABLE client_id_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    entity_type VARCHAR NOT NULL,   -- 'task' | 'project' | 'area' | 'context' | 'tag' | 'subtask'
    client_id VARCHAR NOT NULL,     -- UUID generated on client
    server_id INTEGER NOT NULL,     -- ID assigned by server on CREATE
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, entity_type, client_id)
);
```

Note: `change_log` table is NOT needed for entity-level LWW.
Server changes are collected by `WHERE updated_at > last_sync_timestamp` directly from entity tables.

### 4.7 Preserved API Endpoints
- `/auth/*` — authentication (unchanged). Rate-limited via `slowapi`: 5 req/min on `/auth/login`, `/auth/register`
- `/tasks`, `/projects`, `/contexts`, `/areas`, `/tags` — CRUD endpoints (available for API access, testing, future non-PWA clients)
- `/inbox` — quick capture
- `/notifications/*` — notifications + SSE stream
- `/health` — health check
- `/api/v1/sync`, `/api/v1/sync/full` — Rate-limited via `slowapi`: **30 req/min**. Prevents client bugs (infinite retry loop) from hammering the server.

**Important:** The PWA client does **NOT** call CRUD endpoints directly. All data flows through IndexedDB → Sync Engine → `/sync` endpoints (as described in §2.6). CRUD endpoints exist as a parallel access path for:
- API testing / debugging
- Future mobile native app or third-party integrations
- Direct API usage (e.g., curl)

### 4.8 SSE + Sync Integration (Phase 5)

Server pushes SSE events on entity changes. Client triggers incremental sync on SSE event.

Note: SSE is deferred to Phase 5. For MVP, sync relies on:
- Online event + periodic timer + visibilitychange + manual sync button

## 5. Deployment & Docker

### 5.1 Docker Compose Services

| Service | Image | Purpose |
|---------|-------|---------|
| nginx | nginx:alpine | Static files + reverse proxy |
| api | custom (FastAPI) | REST API server + APScheduler (in-process) |

> **APScheduler replaces Celery + Redis.** For a single-user app, an in-process async scheduler is sufficient and eliminates two extra Docker services, a message broker, and SQLite write contention from separate worker processes.
>
> ```python
> # server/app/main.py
> from apscheduler.schedulers.asyncio import AsyncIOScheduler
>
> scheduler = AsyncIOScheduler(timezone="UTC")
>
> @asynccontextmanager
> async def lifespan(app: FastAPI):
>     scheduler.add_job(send_due_reminders, "interval", minutes=1)
>     scheduler.start()
>     # run migrations
>     alembic_cfg = Config("alembic.ini")
>     command.upgrade(alembic_cfg, "head")
>     yield
>     scheduler.shutdown()
>
> app = FastAPI(lifespan=lifespan)
> ```

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
ALLOW_REGISTRATION=true     # Set to false after first user is created
```

### 5.5 Deployment Process

The Nginx service uses a **multi-stage Docker build** for the client — Node.js is not required on the host:

```dockerfile
# nginx/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
```

Deploy:

```bash
git clone <repo> && cd todowkaapp
cp .env.example .env       # fill SECRET_KEY, REFRESH_TOKEN_HASH_KEY
docker compose up -d --build
# migrations run automatically on container start (lifespan hook)
```

> **First-run checklist:**
> 1. Open the app and register your account
> 2. Set `ALLOW_REGISTRATION=false` in `.env`
> 3. `docker compose up -d` (restarts api with new env)

### 5.6 TLS / SSL

Use Certbot (Let's Encrypt) on the host (not in Docker) to issue and auto-renew certificates:

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
# Certbot edits nginx.conf automatically; auto-renews via systemd timer
```

Nginx config must have `server_name yourdomain.com;` defined before running certbot.

Since Nginx runs in Docker, add the following volume mounts to `docker-compose.yml` for the `nginx` service so it can read the host-issued certificates:

```yaml
# docker-compose.yml — nginx service volumes:
volumes:
  - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  - ./client/dist:/usr/share/nginx/html:ro
  - /etc/letsencrypt:/etc/letsencrypt:ro        # certs from Certbot on host
  - /var/www/certbot:/var/www/certbot:ro         # ACME challenge (for renewal)
```

### 5.7 SQLite Backup Strategy

Daily automated backup via cron on the host:

```bash
# /etc/cron.daily/todowka-backup
docker compose exec -T api sqlite3 /data/todowka.db ".backup /data/backups/todowka-$(date +%Y%m%d).db"
# Retain last 30 days; optionally rsync to remote storage
find /data/backups -name "*.db" -mtime +30 -delete
```

Alternative: use [Litestream](https://litestream.io/) for continuous replication to S3/R2.

## 6. Implementation Phases

### Phase 1: Foundation
- Project scaffolding (Vite + React + FastAPI + Docker Compose)
- Database schema (SQLite + Alembic + WAL mode)
- User authentication (register, login, JWT + refresh tokens, in-memory access token + HttpOnly refresh cookie)
- Basic API endpoints (tasks CRUD)
- Basic frontend: login/register pages + task list + task form
- **Data abstraction layer:** `useTasks()` hook in Phase 1 reads from API. In Phase 3, swapped to read from IndexedDB. UI components remain unchanged.
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
- `sync_in_progress` stale flag recovery (startup check)
- **Acceptance criteria:** Full sync flow tested on iOS Safari standalone mode. If HttpOnly cookie refresh fails on iOS, implement fallback (refresh token in IndexedDB).
- **Tests (written in Phase 4, not deferred):**
  - Unit: LWW logic (newer wins, delete always wins, clock skew scenarios)
  - Unit: dependency ordering (subtask before task → error path)
  - Unit: idempotency (same op_id sent twice → applied once)
  - Integration: full sync round-trip (client → server → client)
  - Integration: offline queue → online → sync → IndexedDB updated

### Phase 5: Advanced Features
- Recurring tasks (APScheduler in-process — jobs registered in FastAPI lifespan)
- Notifications + reminders (APScheduler triggers `send_due_reminders` job every minute)
- SSE real-time notifications + SSE-triggered sync (note: push SSE **after** DB commit to avoid race on receiving device)
- Weekly review workflow: guided GTD review screen — iterate through Inbox (process to zero), active Projects (check next actions), Someday/Maybe (promote or archive). Single `/review` page, step-by-step wizard UI.
- Session management (view/revoke sessions)

### Phase 6: Polish
- Dark mode
- Keyboard shortcuts
- Data export/import (JSON)
- Performance optimization
- E2E tests (Playwright): install flow, offline task creation, sync, multi-device scenarios
- Additional integration tests for Phase 5 features (recurring tasks, notifications)
- Production deployment
- Monitoring & logging
