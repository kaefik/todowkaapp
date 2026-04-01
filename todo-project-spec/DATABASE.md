# Database Schema

## Core Principles

- All tables MUST have `user_id` (except users, refresh_tokens)
- All tables MUST have `created_at` and `updated_at`
- Soft delete pattern: `deleted_at` timestamp
- Foreign keys with CASCADE or RESTRICT as appropriate
- Indexes on frequently queried columns

## Tables

### users

User accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| email | VARCHAR | NOT NULL, UNIQUE | Email address |
| password_hash | VARCHAR | NOT NULL | Hashed password |
| created_at | DATETIME | NOT NULL | Creation timestamp |
| updated_at | DATETIME | NOT NULL | Update timestamp |

**Indexes:**
- `email` (UNIQUE)

### refresh_tokens

JWT refresh tokens for session management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| token_hash | VARCHAR | NOT NULL, UNIQUE | Hashed refresh token |
| user_id | INTEGER | FK, NOT NULL | User ID |
| device_name | VARCHAR | NULL | Device name |
| user_agent | TEXT | NULL | User agent string |
| ip_address | VARCHAR | NULL | IP address |
| is_revoked | BOOLEAN | NOT NULL, DEFAULT false | Revocation status |
| revoked_at | DATETIME | NULL | Revocation timestamp |
| last_used_at | DATETIME | NULL | Last usage |
| expires_at | DATETIME | NOT NULL | Expiration |
| created_at | DATETIME | NOT NULL | Creation |

**Foreign Keys:**
- `user_id` → `users(id)` (ON DELETE CASCADE)

**Indexes:**
- `token_hash` (UNIQUE)
- `user_id`
- `is_revoked`
- `expires_at`

### tasks

Main task entity with GTD support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| user_id | INTEGER | FK, NOT NULL | Owner user |
| title | VARCHAR | NOT NULL | Task title (max 200) |
| description | VARCHAR | NULL | Task description |
| completed | BOOLEAN | NOT NULL, DEFAULT false | Completion status |
| status | VARCHAR | NOT NULL | GTD status |
| priority | VARCHAR | NOT NULL | Priority |
| due_date | DATETIME | NULL | Due date |
| reminder_time | DATETIME | NULL | Reminder time |
| reminder_enabled | BOOLEAN | NOT NULL, DEFAULT false | Reminder flag |
| recurrence_type | VARCHAR | NULL | Recurrence type |
| recurrence_config | TEXT | NULL | JSON config |
| timezone | VARCHAR | NOT NULL, DEFAULT 'UTC' | Timezone |
| is_next_action | BOOLEAN | NOT NULL, DEFAULT false | Next action flag |
| waiting_for | VARCHAR | NULL | Waiting for |
| delegated_to | VARCHAR | NULL | Delegated to |
| someday | BOOLEAN | NOT NULL, DEFAULT false | Someday flag |
| project_id | INTEGER | FK, NULL | Project |
| context_id | INTEGER | FK, NULL | Context |
| area_id | INTEGER | FK, NULL | Area |
| completed_at | DATETIME | NULL | Completion timestamp |
| deleted_at | DATETIME | NULL | Soft delete |
| created_at | DATETIME | NOT NULL | Creation |
| updated_at | DATETIME | NOT NULL | Update |

**Foreign Keys:**
- `user_id` → `users(id)` (ON DELETE CASCADE)
- `project_id` → `projects(id)` (ON DELETE SET NULL)
- `context_id` → `contexts(id)` (ON DELETE SET NULL)
- `area_id` → `areas(id)` (ON DELETE SET NULL)

**Indexes:**
- `user_id`
- `status`
- `priority`
- `due_date`
- `is_next_action`
- `deleted_at`

**Enums:**
- `status`: 'inbox', 'active', 'completed', 'waiting', 'someday'
- `priority`: 'low', 'medium', 'high'
- `recurrence_type`: 'none', 'daily', 'weekly', 'monthly', 'yearly'

### projects

Project grouping.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| user_id | INTEGER | FK, NOT NULL | Owner user |
| name | VARCHAR | NOT NULL | Project name (max 100) |
| description | VARCHAR | NULL | Description |
| area_id | INTEGER | FK, NULL | Area |
| status | VARCHAR | NOT NULL, DEFAULT 'active' | Status |
| progress | INTEGER | NOT NULL, DEFAULT 0 | Progress 0-100 |
| start_date | DATETIME | NULL | Start date |
| end_date | DATETIME | NULL | End date |
| color | VARCHAR | NULL | HEX color |
| created_at | DATETIME | NOT NULL | Creation |
| updated_at | DATETIME | NOT NULL | Update |

**Foreign Keys:**
- `user_id` → `users(id)` (ON DELETE CASCADE)
- `area_id` → `areas(id)` (ON DELETE SET NULL)

**Indexes:**
- `user_id`
- `area_id`
- `status`

**Enums:**
- `status`: 'active', 'completed', 'paused'

### contexts

Situational organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| user_id | INTEGER | FK, NOT NULL | Owner user |
| name | VARCHAR | NOT NULL | Name (max 100) |
| description | VARCHAR | NULL | Description |
| icon | VARCHAR | NULL | Emoji icon |
| color | VARCHAR | NULL | HEX color |
| created_at | DATETIME | NOT NULL | Creation |
| updated_at | DATETIME | NOT NULL | Update |

**Foreign Keys:**
- `user_id` → `users(id)` (ON DELETE CASCADE)

**Indexes:**
- `user_id`
- `name` (UNIQUE per user)

### areas

Areas of responsibility.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| user_id | INTEGER | FK, NOT NULL | Owner user |
| name | VARCHAR | NOT NULL | Name (max 100) |
| description | VARCHAR | NULL | Description |
| color | VARCHAR | NULL | HEX color |
| created_at | DATETIME | NOT NULL | Creation |
| updated_at | DATETIME | NOT NULL | Update |

**Foreign Keys:**
- `user_id` → `users(id)` (ON DELETE CASCADE)

**Indexes:**
- `user_id`
- `name` (UNIQUE per user)

### tags

Flexible categorization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| user_id | INTEGER | FK, NOT NULL | Owner user |
| name | VARCHAR | NOT NULL | Name (max 100) |
| color | VARCHAR | NULL | HEX color |
| created_at | DATETIME | NOT NULL | Creation |
| updated_at | DATETIME | NOT NULL | Update |

**Foreign Keys:**
- `user_id` → `users(id)` (ON DELETE CASCADE)

**Indexes:**
- `user_id`
- `name` (UNIQUE per user)

### subtasks

Task subtasks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| task_id | INTEGER | FK, NOT NULL | Parent task |
| title | VARCHAR | NOT NULL | Title (max 200) |
| completed | BOOLEAN | NOT NULL, DEFAULT false | Completion |
| order | INTEGER | NULL | Display order |
| created_at | DATETIME | NOT NULL | Creation |
| updated_at | DATETIME | NOT NULL | Update |

**Foreign Keys:**
- `task_id` → `tasks(id)` (ON DELETE CASCADE)

**Indexes:**
- `task_id`
- `order`

### notifications

Task notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| user_id | INTEGER | FK, NOT NULL | Owner user |
| task_id | INTEGER | FK, NULL | Related task |
| message | VARCHAR | NOT NULL | Message |
| status | VARCHAR | NOT NULL, DEFAULT 'pending' | Status |
| scheduled_at | DATETIME | NULL | Scheduled time |
| sent_at | DATETIME | NULL | Sent time |
| delivery_method | VARCHAR | NOT NULL, DEFAULT 'sse' | Method |
| read | BOOLEAN | NOT NULL, DEFAULT false | Read status |
| meta_data | JSON | NULL | Extra data |
| error_message | VARCHAR | NULL | Error |
| created_at | DATETIME | NOT NULL | Creation |
| updated_at | DATETIME | NOT NULL | Update |

**Foreign Keys:**
- `user_id` → `users(id)` (ON DELETE CASCADE)
- `task_id` → `tasks(id)` (ON DELETE CASCADE)

**Indexes:**
- `user_id`
- `task_id`
- `status`
- `read`
- `(status, created_at)`
- `(task_id, created_at)`

**Enums:**
- `status`: 'pending', 'sent', 'failed'
- `delivery_method`: 'sse', 'polling', 'browser'

### task_tags

Many-to-many: tasks ↔ tags.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| task_id | INTEGER | FK, PK | Task ID |
| tag_id | INTEGER | FK, PK | Tag ID |

**Foreign Keys:**
- `task_id` → `tasks(id)` (ON DELETE CASCADE)
- `tag_id` → `tags(id)` (ON DELETE CASCADE)

**Primary Key:** (task_id, tag_id)

**Indexes:**
- `task_id`
- `tag_id`

## Relationships

```
users (1) ----< (N) refresh_tokens
        |
        | (1)
        |----< (N) tasks ----< (N) task_tags ----> (N) tags
        |       | (1)                                  |
        |       |                                      (M)
        |       |
        |       | (1)                               subtasks (N)
        |       |----< (N) notifications
        |       |
        |----< (N) projects ----< (N) areas
        |
        |----< (N) contexts
        |
        |----< (N) areas
```

## Cascade Rules

- **ON DELETE CASCADE:**
  - users → refresh_tokens
  - users → tasks, projects, contexts, areas, tags, notifications
  - tasks → subtasks, notifications, task_tags
  - projects → tasks (project_id SET NULL)

- **ON DELETE SET NULL:**
  - tasks.project_id → projects
  - tasks.context_id → contexts
  - tasks.area_id → areas
  - projects.area_id → areas

## Default Values

- `tasks.completed`: false
- `tasks.status`: 'active'
- `tasks.priority`: 'medium'
- `tasks.reminder_enabled`: false
- `tasks.timezone`: 'UTC'
- `tasks.is_next_action`: false
- `tasks.someday`: false
- `projects.status`: 'active'
- `projects.progress`: 0
- `notifications.status`: 'pending'
- `notifications.delivery_method`: 'sse'
- `notifications.read`: false
- `refresh_tokens.is_revoked`: false
- `subtasks.completed`: false

## Unique Constraints

- `users.email`
- `refresh_tokens.token_hash`
- `tasks.user_id + name` (NOT required, but good practice)
- `contexts.user_id + name`
- `areas.user_id + name`
- `tags.user_id + name`

## Important Notes

1. **User Isolation:** ALL user data MUST be filtered by `user_id`
2. **Soft Delete:** Use `deleted_at` for tasks, never hard delete
3. **Timezone:** Store all datetimes in UTC, convert client-side
4. **JSON Fields:** Store JSON as TEXT for flexibility
5. **Recurrence:** Create new tasks based on recurrence config
6. **Progress:** Calculate project progress dynamically from tasks
7. **Notifications:** Auto-cleanup old notifications (optional)
