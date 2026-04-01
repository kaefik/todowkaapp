# API Specification

**Base URL:** `http://localhost:8000`
**API Version:** `/api/v1`
**Content-Type:** `application/json`

## Authentication

All endpoints (except auth) require authentication via HTTP-only cookie:
- Cookie name: `access_token`
- Type: JWT token
- HttpOnly, Secure, SameSite=Lax

### Response Format

**Success:**
```json
{
  "data": { ... }
}
```

**Error:**
```json
{
  "detail": "Error message"
}
```

**Pagination:**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "pages": 10
}
```

## Authentication Endpoints

### Register

**POST** `/auth/register`

Create new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T10:00:00Z"
}
```

**Validation:**
- email: valid email format, unique
- password: min 8 chars, 1 uppercase, 1 lowercase, 1 digit

### Login

**POST** `/auth/login`

Authenticate user, receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:** 200 OK
```json
{
  "refresh_token_id": 42,
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z"
  }
}
```

**Cookies Set:**
- `access_token`: JWT (short-lived)
- `refresh_token`: Plain token (path: `/api/v1/auth/refresh`)

### Logout

**POST** `/auth/logout`

Invalidate current session.

**Response:** 200 OK
```json
{
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**
- `access_token`
- `refresh_token`

### Refresh Token

**POST** `/auth/refresh`

Refresh access token using refresh token.

**Request:** None (uses refresh cookie)

**Response:** 200 OK
```json
{
  "refresh_token_id": 43,
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z"
  }
}
```

**Cookies Updated:**
- `access_token`: New JWT
- `refresh_token`: New token

### Get Current User

**GET** `/auth/me`

Get authenticated user info.

**Response:** 200 OK
```json
{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T10:00:00Z"
}
```

### Get User Sessions

**GET** `/auth/sessions`

Get all active sessions.

**Response:** 200 OK
```json
{
  "sessions": [
    {
      "id": 1,
      "device_name": "Chrome on Windows",
      "user_agent": "Mozilla/5.0...",
      "ip_address": "192.168.1.1",
      "last_used_at": "2026-04-01T12:00:00Z",
      "created_at": "2026-04-01T10:00:00Z",
      "is_current": true
    }
  ]
}
```

### Revoke All Sessions

**DELETE** `/auth/sessions/all`

Revoke all sessions except current.

**Response:** 200 OK
```json
{
  "message": "Revoked 3 sessions"
}
```

### Revoke Session

**DELETE** `/auth/sessions/{session_id}`

Revoke specific session.

**Response:** 200 OK
```json
{
  "message": "Session revoked"
}
```

**Error:** 400 Bad Request (if trying to revoke current session)

## Tasks

### Get Tasks

**GET** `/tasks`

Query params:
- `page` (int, default: 1)
- `limit` (int, default: 10, max: 100)
- `status` (string): inbox, active, completed, waiting, someday
- `priority` (string): low, medium, high
- `project_id` (int)
- `context_id` (int)
- `area_id` (int)
- `tag_id` (int)
- `search` (string)
- `sort` (string): created_at, priority, title
- `order` (string): asc, desc

**Response:** 200 OK (paginated)

### Get Task by ID

**GET** `/tasks/{task_id}`

**Response:** 200 OK
```json
{
  "id": 1,
  "user_id": 1,
  "title": "Task title",
  "description": "Description",
  "completed": false,
  "status": "active",
  "priority": "medium",
  "due_date": null,
  "reminder_time": null,
  "reminder_enabled": false,
  "recurrence_type": null,
  "recurrence_config": null,
  "timezone": "UTC",
  "is_next_action": false,
  "waiting_for": null,
  "delegated_to": null,
  "someday": false,
  "project_id": 1,
  "context_id": null,
  "area_id": null,
  "tag_ids": [1, 2],
  "completed_at": null,
  "deleted_at": null,
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T10:00:00Z"
}
```

### Create Task

**POST** `/tasks`

**Request:**
```json
{
  "title": "Task title",
  "description": "Description",
  "status": "active",
  "priority": "medium",
  "due_date": "2026-04-15T10:00:00Z",
  "reminder_time": null,
  "reminder_enabled": false,
  "recurrence_type": null,
  "recurrence_config": null,
  "timezone": "UTC",
  "project_id": 1,
  "context_id": null,
  "area_id": null,
  "tag_ids": [1, 2],
  "is_next_action": false,
  "waiting_for": null
}
```

**Response:** 201 Created

### Update Task

**PUT** `/tasks/{task_id}`

**Request:** Same as create (all fields optional)

**Response:** 200 OK

### Delete Task

**DELETE** `/tasks/{task_id}`

Soft delete (sets `deleted_at`).

**Response:** 200 OK
```json
{
  "message": "Task deleted"
}
```

### Complete Task

**POST** `/tasks/{task_id}/complete`

Mark task as completed.

**Response:** 200 OK
```json
{
  "id": 1,
  "completed": true,
  "completed_at": "2026-04-01T12:00:00Z",
  "status": "completed"
}
```

### Toggle Next Action

**POST** `/tasks/{task_id}/next-action`

Toggle `is_next_action` flag.

**Response:** 200 OK
```json
{
  "id": 1,
  "is_next_action": true
}
```

### Set Waiting For

**POST** `/tasks/{task_id}/waiting`

Set waiting status.

**Request:**
```json
{
  "waiting_for": "John Smith"
}
```

**Response:** 200 OK
```json
{
  "id": 1,
  "waiting_for": "John Smith",
  "status": "waiting"
}
```

### Set Recurrence

**POST** `/tasks/{task_id}/recurrence`

Set recurrence pattern.

**Request:**
```json
{
  "recurrence_type": "weekly",
  "recurrence_config": {
    "days_of_week": [1, 3, 5]
  }
}
```

**Response:** 200 OK

### Set Timezone

**POST** `/tasks/{task_id}/timezone`

Set task timezone.

**Request:**
```json
{
  "timezone": "Europe/Moscow"
}
```

**Response:** 200 OK

## Inbox

### Create Inbox Item

**POST** `/inbox`

Quick capture (title only, status=auto).

**Request:**
```json
{
  "title": "Quick task",
  "description": "Optional description"
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "title": "Quick task",
  "status": "inbox",
  "priority": "medium"
}
```

### Get Inbox Items

**GET** `/inbox`

Get all inbox tasks (status=inbox).

Query params:
- `page`, `limit`, `search`, `sort`, `order`

**Response:** 200 OK (paginated)

## Projects

### Get Projects

**GET** `/projects`

Query params:
- `page`, `limit`

**Response:** 200 OK (paginated)

### Get Project by ID

**GET** `/projects/{project_id}`

**Response:** 200 OK
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Project name",
  "description": "Description",
  "area_id": 1,
  "status": "active",
  "progress": 45,
  "start_date": "2026-04-01T00:00:00Z",
  "end_date": null,
  "color": "#FF0000",
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T11:00:00Z"
}
```

### Create Project

**POST** `/projects`

**Request:**
```json
{
  "name": "Project name",
  "description": "Description",
  "area_id": 1,
  "color": "#FF0000"
}
```

**Response:** 201 Created

### Update Project

**PUT** `/projects/{project_id}`

**Request:** Same as create (all fields optional)

**Response:** 200 OK

### Delete Project

**DELETE** `/projects/{project_id}`

**Response:** 200 OK
```json
{
  "message": "Project deleted"
}
```

### Complete Project

**POST** `/projects/{project_id}/complete`

Mark project as completed.

**Response:** 200 OK
```json
{
  "id": 1,
  "status": "completed",
  "progress": 100
}
```

## Contexts

### Get Contexts

**GET** `/contexts`

**Response:** 200 OK (paginated)

### Get Context by ID

**GET** `/contexts/{context_id}`

**Response:** 200 OK
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Home",
  "description": "Tasks at home",
  "icon": "🏠",
  "color": "#00FF00",
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T10:00:00Z"
}
```

### Create Context

**POST** `/contexts`

**Request:**
```json
{
  "name": "Home",
  "description": "Tasks at home",
  "icon": "🏠",
  "color": "#00FF00"
}
```

**Response:** 201 Created

### Update Context

**PUT** `/contexts/{context_id}`

**Request:** Same as create (all fields optional)

**Response:** 200 OK

### Delete Context

**DELETE** `/contexts/{context_id}`

**Response:** 200 OK

## Areas

### Get Areas

**GET** `/areas`

**Response:** 200 OK (paginated)

### Get Area by ID

**GET** `/areas/{area_id}`

**Response:** 200 OK
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Health",
  "description": "Health-related tasks",
  "color": "#0000FF",
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T10:00:00Z"
}
```

### Create Area

**POST** `/areas`

**Request:**
```json
{
  "name": "Health",
  "description": "Health-related tasks",
  "color": "#0000FF"
}
```

**Response:** 201 Created

### Update Area

**PUT** `/areas/{area_id}`

**Request:** Same as create (all fields optional)

**Response:** 200 OK

### Delete Area

**DELETE** `/areas/{area_id}`

**Response:** 200 OK

## Tags

### Get Tags

**GET** `/tags`

**Response:** 200 OK (paginated)

### Get Tag by ID

**GET** `/tags/{tag_id}`

**Response:** 200 OK
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Work",
  "color": "#FF0000",
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T10:00:00Z"
}
```

### Create Tag

**POST** `/tags`

**Request:**
```json
{
  "name": "Work",
  "color": "#FF0000"
}
```

**Response:** 201 Created

### Update Tag

**PUT** `/tags/{tag_id}`

**Request:** Same as create (all fields optional)

**Response:** 200 OK

### Delete Tag

**DELETE** `/tags/{tag_id}`

**Response:** 200 OK

## Subtasks

### Get Subtasks for Task

**GET** `/tasks/{task_id}/subtasks`

**Response:** 200 OK
```json
[
  {
    "id": 1,
    "task_id": 1,
    "title": "Subtask 1",
    "completed": false,
    "order": 1,
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z"
  }
]
```

### Create Subtask

**POST** `/tasks/{task_id}/subtasks`

**Request:**
```json
{
  "title": "Subtask title",
  "order": 1
}
```

**Response:** 201 Created

### Update Subtask

**PUT** `/subtasks/{subtask_id}`

**Request:**
```json
{
  "title": "Updated title",
  "completed": true,
  "order": 2
}
```

**Response:** 200 OK

### Delete Subtask

**DELETE** `/subtasks/{subtask_id}`

**Response:** 200 OK

## Notifications

### Get Notifications

**GET** `/notifications`

Query params:
- `page`, `limit`
- `unread` (boolean) - filter by read status

**Response:** 200 OK (paginated)
```json
{
  "items": [
    {
      "id": 1,
      "user_id": 1,
      "task_id": 1,
      "message": "Task reminder",
      "status": "sent",
      "scheduled_at": "2026-04-01T10:00:00Z",
      "sent_at": "2026-04-01T10:00:00Z",
      "delivery_method": "sse",
      "read": false,
      "meta_data": null,
      "error_message": null,
      "created_at": "2026-04-01T10:00:00Z",
      "updated_at": "2026-04-01T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "pages": 1
}
```

### Get Notification by ID

**GET** `/notifications/{notification_id}`

**Response:** 200 OK

### Get Unread Notifications

**GET** `/notifications/unread`

**Response:** 200 OK (array)

### Mark Notification as Read

**POST** `/notifications/{notification_id}/read`

**Response:** 200 OK
```json
{
  "id": 1,
  "read": true
}
```

### Mark All Notifications as Read

**POST** `/notifications/read-all`

**Response:** 200 OK
```json
{
  "message": "All notifications marked as read"
}
```

## Real-time Notifications (SSE)

### Notification Stream

**GET** `/notifications/stream`

Server-Sent Events stream for real-time notifications.

**Headers:**
- `Accept: text/event-stream`
- `Cache-Control: no-cache`

**Events:**
```
data: {"id": 1, "message": "Task reminder", "task_id": 1, ...}

: heartbeat
```

**Reconnection:**
- Auto-reconnect with exponential backoff
- Last-Event-ID header for resumption

**Timeout:** 30 seconds (client should reconnect)

## Health Check

### System Health

**GET** `/health`

**Response:** 200 OK
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-04-01T12:00:00Z"
}
```

### Notifications Health

**GET** `/health/notifications`

**Response:** 200 OK
```json
{
  "status": "healthy",
  "celery_worker": "running",
  "redis": "connected",
  "sse_active": true,
  "timestamp": "2026-04-01T12:00:00Z"
}
```

## Error Codes

- **400 Bad Request** - Invalid input
- **401 Unauthorized** - Not authenticated or token expired
- **403 Forbidden** - Access denied (wrong user)
- **404 Not Found** - Resource not found
- **422 Unprocessable Entity** - Validation error
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Server error

## Rate Limiting

- Default: 100 requests per minute per IP
- Headers:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 95
  - `X-RateLimit-Reset`: 1609459200

## Pagination Default

- `page`: 1
- `limit`: 10
- `max limit`: 100
