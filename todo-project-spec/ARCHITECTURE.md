# System Architecture

## Overview

Full-stack task management application with REST API backend, modern SPA frontend, real-time notifications, and background task processing.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Web App   │  │  Mobile App  │  │   Other     │  │
│  │ (Next.js)   │  │ (Future)    │  │  Clients    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
└─────────┼──────────────────┼─────────────────┼───────────┘
          │                  │                 │
          └──────────────────┴─────────────────┘
                            │ HTTP/HTTPS
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       API Gateway                         │
│                    (Load Balancer)                        │
└───────────────────────┬───────────────────────────────────┘
                        │
      ┌───────────────────┴───────────────────┐
      ↓                                       ↓
┌─────────────┐                     ┌─────────────┐
│   API Server│                     │   API Server│
│  Instance 1 │                     │  Instance 2 │
└──────┬──────┘                     └──────┬──────┘
       │                                    │
       └────────────┬───────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ↓                       ↓
┌─────────────┐       ┌─────────────┐
│  Database   │       │    Redis    │
│ (PostgreSQL)│       │   Cache     │
└─────────────┘       └──────┬──────┘
                             │
                             ↓
                    ┌─────────────┐
                    │  Celery    │
                    │  Workers   │
                    └─────────────┘
```

## Backend Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────┐
│              Presentation Layer                │
│              (API Routes / Endpoints)        │
├─────────────────────────────────────────────────┤
│              Business Logic Layer             │
│              (Services)                     │
├─────────────────────────────────────────────────┤
│              Data Access Layer               │
│              (Repositories)                  │
├─────────────────────────────────────────────────┤
│              Data Layer                     │
│              (ORM / Database)               │
└─────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Routes Layer (`routes/`)
**Responsibility:** HTTP request/response handling

**Components:**
- Authentication routes (`auth.py`)
- Task routes (`tasks.py`)
- Project routes (`projects.py`)
- Context routes (`contexts.py`)
- Area routes (`areas.py`)
- Tag routes (`tags.py`)
- Notification routes (`notifications.py`)
- Health check routes (`health.py`)

**Responsibilities:**
- Parse request data
- Validate input
- Call services
- Format responses
- Handle errors

**Example:**
```python
@router.post("/tasks")
async def create_task(task_data: TaskCreate):
    try:
        task = task_service.create(task_data)
        return {"id": task.id, **task_data.dict()}
    except ValidationError as e:
        raise HTTPException(400, str(e))
```

#### 2. Services Layer (`services/`)
**Responsibility:** Business logic and coordination

**Components:**
- Task service (`task_service.py`)
- Project service (`project_service.py`)
- Auth service (`auth_service.py`)
- Notification service (`notification_service.py`)
- Reminder service (`reminder_service.py`)

**Responsibilities:**
- Implement business rules
- Coordinate multiple repositories
- Validate business logic
- Handle transactions

**Example:**
```python
class TaskService:
    def create(self, user_id: int, task_data: TaskCreate):
        # Validate business rules
        if task_data.status == "completed":
            raise ValidationError("Cannot create completed task")

        # Create task
        task = Task(user_id=user_id, **task_data.dict())
        db.add(task)
        db.commit()

        # Create reminder if needed
        if task_data.reminder_enabled:
            self._schedule_reminder(task)

        return task
```

#### 3. Repositories Layer (`repositories/`)
**Responsibility:** Database operations

**Components:**
- Task repository (`task_repository.py`)
- Project repository (`project_repository.py`)
- User repository (`user_repository.py`)
- Refresh token repository (`refresh_token_repository.py`)
- Session repository (`session_repository.py`)

**Responsibilities:**
- CRUD operations
- Query building
- Data mapping
- Transaction handling

**Example:**
```python
class TaskRepository:
    def get_by_user(self, user_id: int, filters: dict):
        query = self.db.query(Task).filter(
            Task.user_id == user_id,
            Task.deleted_at.is_(None)
        )

        if filters.get('status'):
            query = query.filter(Task.status == filters['status'])

        return query.all()
```

#### 4. Models Layer (`models/`)
**Responsibility:** Database schema definition

**Components:**
- User model (`user.py`)
- Task model (`task.py`)
- Project model (`project.py`)
- etc.

**Responsibilities:**
- Define table schema
- Define relationships
- Define indexes
- Define constraints

#### 5. Schemas Layer (`schemas/`)
**Responsibility:** Input/output validation

**Components:**
- Task schemas (`task.py`)
- User schemas (`user.py`)
- etc.

**Responsibilities:**
- Define request models
- Define response models
- Validate input data
- Serialize output data

### Request Flow

```
1. HTTP Request
   ↓
2. Middleware (CORS, Logging, Rate Limiting, Auth)
   ↓
3. Route Handler
   ↓
4. Pydantic Validation (Request Schema)
   ↓
5. Service Layer (Business Logic)
   ↓
6. Repository Layer (Database Operation)
   ↓
7. ORM (SQL Generation)
   ↓
8. Database Query
   ↓
9. Response Mapping (Response Schema)
   ↓
10. HTTP Response
```

## Frontend Architecture

### Component Architecture

```
┌─────────────────────────────────────────────────┐
│              Application Layer                 │
│              (Pages / Routes)                │
├─────────────────────────────────────────────────┤
│              Presentation Layer               │
│              (UI Components)                 │
├─────────────────────────────────────────────────┤
│              State Management Layer           │
│              (Zustand Stores)               │
├─────────────────────────────────────────────────┤
│              Data Layer                      │
│              (TanStack Query)                │
├─────────────────────────────────────────────────┤
│              API Layer                       │
│              (HTTP Client)                   │
└─────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Pages Layer (`app/`)
**Responsibility:** Route definitions and page composition

**Structure:**
```
app/
├── (dashboard)/      # Protected routes
│   ├── inbox/
│   ├── tasks/
│   ├── projects/
│   └── ...
├── login/
├── register/
└── notifications/
```

#### 2. Components Layer (`components/`)
**Responsibility:** Reusable UI components

**Structure:**
```
components/
├── ui/              # Base components
│   ├── Button.tsx
│   ├── Input.tsx
│   └── ...
├── task/            # Task-specific
│   ├── TaskItem.tsx
│   ├── TaskList.tsx
│   └── ...
├── project/         # Project-specific
│   ├── ProjectCard.tsx
│   └── ...
└── layout/          # Layout components
    ├── Sidebar.tsx
    └── Header.tsx
```

#### 3. State Management Layer (`stores/`)
**Responsibility:** Global state management

**Stores:**
- Auth Store (`useAuthStore.ts`)
- Task Store (`useTaskStore.ts`)
- Navigation Store (`useNavigationStore.ts`)
- Notification Store (`useNotificationStore.ts`)

**Example:**
```typescript
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {
    const user = await apiLogin(credentials);
    set({ user, isAuthenticated: true });
  },
  logout: async () => {
    await apiLogout();
    set({ user: null, isAuthenticated: false });
  },
}));
```

#### 4. Data Layer (`lib/hooks/`)
**Responsibility:** Server state management with TanStack Query

**Hooks:**
- `useTasks` - Fetch and cache tasks
- `useCreateTask` - Create task with optimistic update
- `useUpdateTask` - Update task with optimistic update
- `useProjects` - Fetch and cache projects
- etc.

**Example:**
```typescript
export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasks(filters),
    staleTime: 30000, // 30 seconds
  });
}
```

#### 5. API Layer (`lib/api/`)
**Responsibility:** HTTP client and endpoint definitions

**Modules:**
- `auth.ts` - Authentication endpoints
- `tasks.ts` - Task endpoints
- `projects.ts` - Project endpoints
- etc.

**Example:**
```typescript
export async function fetchTasks(filters: TaskFilters) {
  const params = new URLSearchParams(filters as any);
  const response = await fetch(`/api/v1/tasks?${params}`, {
    credentials: 'include',
  });
  return response.json();
}
```

## Real-time Architecture

### Server-Sent Events (SSE)

**Purpose:** Real-time notification delivery

**Flow:**
```
1. Client connects to /notifications/stream
2. Server keeps connection open
3. Server sends events as they occur
4. Client processes events
5. Auto-reconnect on disconnect
```

**Server Implementation:**
```python
@router.get("/notifications/stream")
async def notification_stream(user_id: int):
    async def event_generator():
        while True:
            # Check for new notifications
            notifications = get_pending_notifications(user_id)
            for notif in notifications:
                yield f"data: {notif.to_json()}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

**Client Implementation:**
```javascript
const eventSource = new EventSource('/api/v1/notifications/stream', {
  withCredentials: true,
});

eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  showNotification(notification);
};

eventSource.onerror = () => {
  // Reconnect logic
  setTimeout(() => {
    eventSource = new EventSource('/api/v1/notifications/stream');
  }, 5000);
};
```

### Polling Fallback

**Purpose:** Fallback when SSE unavailable

**Logic:**
1. Try SSE first
2. If fails (>30s), switch to polling
3. Poll every 30 seconds
4. Attempt SSE reconnect every 60 seconds
5. Switch back to SSE if successful

## Background Task Architecture

### Celery Workers

**Purpose:** Asynchronous task processing

**Tasks:**
- Send notification reminders
- Create recurring tasks
- Clean up expired tokens
- Process bulk operations

**Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Broker    │────▶│   Worker    │────▶│   Result    │
│  (Redis)    │     │   (Celery)  │     │  (Redis)    │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Task Example:**
```python
@celery.task
def send_notification(notification_id: int):
    notification = db.query(Notification).get(notification_id)
    send_via_sse(notification)
    notification.status = "sent"
    db.commit()
```

### Scheduled Tasks (Celery Beat)

**Purpose:** Periodic task execution

**Schedule:**
```python
beat_schedule = {
    'check-reminders': {
        'task': 'app.services.reminders.check_reminders',
        'schedule': crontab(minute='*'),  # Every minute
    },
    'cleanup-tokens': {
        'task': 'app.services.reminders.cleanup_expired_tokens',
        'schedule': crontab(hour=0),  # Daily at midnight
    },
}
```

## Security Architecture

### Authentication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Login Request
       ↓
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 2. Generate Tokens
       ↓
┌─────────────────────────┐
│   HttpOnly Cookies     │
│   - access_token       │
│   - refresh_token     │
└─────────────────────────┘
       │ 3. Send Cookies with Request
       ↓
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 4. Verify Token
       ↓
┌─────────────┐
│   Process   │
```

### Security Layers

1. **Network Layer**
   - HTTPS/TLS encryption
   - DDoS protection (Cloudflare, etc.)

2. **Application Layer**
   - CORS configuration
   - Rate limiting
   - Input validation
   - SQL injection prevention (parameterized queries)
   - XSS protection (HttpOnly cookies)

3. **Authentication Layer**
   - JWT access tokens (short-lived)
   - Refresh tokens (hashed, rotated)
   - Session management

4. **Authorization Layer**
   - User data isolation (user_id)
   - Role-based access control (future)
   - Resource ownership checks

5. **Data Layer**
   - Encrypted at rest (future)
   - Backup encryption
   - Access logging

## Scalability Considerations

### Horizontal Scaling

**API Servers:**
- Stateless design
- Load balancer distributes requests
- Multiple instances handle traffic

**Database:**
- Read replicas (future)
- Connection pooling
- Query optimization

**Cache:**
- Redis cache for frequently accessed data
- Distributed cache (future)

**Background Tasks:**
- Multiple Celery workers
- Queue-based processing
- Auto-scaling workers (future)

### Performance Optimization

**Backend:**
- Database indexes
- Query optimization
- Response caching
- Compression (gzip)
- Async I/O

**Frontend:**
- Code splitting
- Lazy loading
- Image optimization
- Bundle size minimization
- CDN for static assets

## Data Flow Diagrams

### Task Creation Flow

```
User → Frontend Form
   ↓
API Request (POST /tasks)
   ↓
Route Handler (auth + validation)
   ↓
Task Service (business logic)
   ↓
Task Repository (database operation)
   ↓
Database (insert record)
   ↓
Task Repository (return task)
   ↓
Task Service (schedule reminder if needed)
   ↓
Celery Queue (background task)
   ↓
Response (201 Created + task data)
   ↓
Frontend (update UI + cache)
```

### Notification Flow

```
Celery Beat (scheduled check)
   ↓
Check Reminders Service
   ↓
Find due tasks
   ↓
Create notifications
   ↓
Send to SSE Stream
   ↓
Client receives event
   ↓
Show notification (browser + in-app)
```

### Authentication Flow

```
Login Request
   ↓
Validate credentials
   ↓
Create refresh token (database)
   ↓
Generate JWT access token
   ↓
Set HttpOnly cookies
   ↓
Return user data
   ↓
Store user in state
   ↓
Redirect to dashboard
```

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────┐
│    Development Machine              │
│                                   │
│  ┌─────────────┐                 │
│  │ Frontend    │ (npm run dev)  │
│  │ :3000       │                 │
│  └─────────────┘                 │
│                                   │
│  ┌─────────────┐                 │
│  │ Backend     │ (uvicorn)       │
│  │ :8000       │                 │
│  └──────┬──────┘                 │
│         │                         │
│  ┌──────┴──────┐                 │
│  │  SQLite DB  │                 │
│  └─────────────┘                 │
│                                   │
│  ┌─────────────┐                 │
│  │  Redis      │                 │
│  │  :6379      │                 │
│  └─────────────┘                 │
└─────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────────────┐
│              Load Balancer                 │
│         (Nginx / Cloudflare)             │
└──────────┬──────────────┬───────────────┘
           ↓              ↓
    ┌──────────┐    ┌──────────┐
    │ Frontend │    │ Backend  │
    │ (CDN)    │    │ (App)    │
    └──────────┘    └────┬─────┘
                        │
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │PostgreSQL│  │  Redis   │  │ Celery   │
    │  Master  │  │  Cluster │  │ Workers  │
    └──────────┘  └──────────┘  └──────────┘
```

## Technology Recommendations

### Backend Stack Options

**Option 1: Python**
- Framework: FastAPI, Django REST, Flask
- ORM: SQLAlchemy, Django ORM
- Tasks: Celery
- Cache: Redis

**Option 2: Node.js**
- Framework: Express.js, NestJS, Fastify
- ORM: TypeORM, Prisma, Sequelize
- Tasks: Bull, Agenda
- Cache: Redis

**Option 3: Go**
- Framework: Gin, Echo, Fiber
- ORM: GORM, sqlx
- Tasks: Asynq, Watermill
- Cache: Redis

### Frontend Stack Options

**Option 1: React Ecosystem**
- Framework: Next.js, Remix, Vite+React
- State: Zustand, Redux, Jotai
- Data Fetching: TanStack Query, SWR
- Styling: Tailwind CSS, CSS Modules

**Option 2: Vue Ecosystem**
- Framework: Nuxt 3, Vue 3
- State: Pinia
- Data Fetching: VueUse, Pinia stores
- Styling: Tailwind CSS, UnoCSS

**Option 3: Angular**
- Framework: Angular 17+
- State: NgRx, Signals
- Data Fetching: RxJS
- Styling: Angular Material, Tailwind

## Monitoring & Observability

### Application Monitoring
- Error tracking (Sentry, Rollbar)
- Performance monitoring (APM)
- Uptime monitoring

### Logging
- Structured logging (JSON format)
- Log levels: DEBUG, INFO, WARNING, ERROR
- Centralized logging (ELK, CloudWatch)

### Metrics
- Request rate
- Response time
- Error rate
- Database queries
- Cache hit rate
- Active sessions

## Testing Architecture

### Backend Testing
- Unit tests (pytest, Jest)
- Integration tests (API endpoints)
- E2E tests (playwright, Cypress)

### Frontend Testing
- Unit tests (Jest, Vitest)
- Component tests (Testing Library)
- E2E tests (playwright, Cypress)

### Testing Strategy
- Test coverage >80%
- CI/CD pipeline
- Automated testing on PR

## Development Workflow

### Branch Strategy
- `main` - Production
- `develop` - Development
- `feature/*` - Feature branches
- `bugfix/*` - Bug fixes

### CI/CD Pipeline
1. Run tests
2. Run linters
3. Build artifacts
4. Deploy to staging
5. Run E2E tests
6. Deploy to production

### Git Hooks
- Pre-commit: lint, format
- Pre-push: tests
