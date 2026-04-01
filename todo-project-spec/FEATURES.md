# Features Specification

## User Management

### Registration
- Create new user account with email and password
- Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 digit
- Unique email validation
- Automatic login after registration

### Authentication
- Email/password login
- JWT access tokens (short-lived, e.g., 15 minutes)
- Refresh tokens (long-lived, e.g., 30 days)
- Automatic token refresh before expiration
- Logout with session termination

### Session Management
- Track multiple devices/sessions per user
- View all active sessions with device info
- Revoke specific session
- Revoke all sessions except current
- Device tracking (user agent, IP address, last used)

## Task Management

### Core Task Properties
- Title (required, max 200 chars)
- Description (optional, max 1000 chars)
- Status: inbox, active, completed, waiting, someday
- Priority: low, medium, high
- Due date (optional)
- Timezone support (default: UTC)

### GTD Status Flow
```
Inbox → Active → Completed
        ↓
     Waiting
        ↓
     Someday
```

### Task Operations
- Create task
- Update task (all fields)
- Delete task (soft delete)
- Complete task
- Mark as next action
- Set waiting for (person/task)
- Set delegated to (person)
- Set recurrence pattern

### Task Filtering
- Filter by status (inbox, active, completed, waiting, someday)
- Filter by priority (low, medium, high)
- Filter by project
- Filter by context
- Filter by area
- Filter by tags (multiple)
- Search by title
- Sort by: created_at, priority, title (asc/desc)
- Pagination (page, limit)

### Task Recurrence
- Recurrence types: none, daily, weekly, monthly, yearly
- Recurrence config:
  - Weekly: days_of_week (array of 1-7)
  - Monthly: day_of_month (1-31)
  - Yearly: day_of_month + month (default: all)
- Automatic task creation on recurrence

## Task Reminders

### Reminder Configuration
- Set reminder time (optional)
- Enable/disable reminder flag
- Timezone-aware scheduling

### Notification Delivery
- Real-time via SSE (primary method)
- Polling fallback (every 30s) if SSE unavailable
- Browser notifications (with user permission)
- In-app notification center
- Mark notifications as read (single or all)
- Notification history

### Notification Types
- Task due reminder
- Task overdue alert
- Recurring task created
- Session activity alerts (optional)

## Project Management

### Core Project Properties
- Name (required, max 100 chars)
- Description (optional, max 500 chars)
- Area (optional)
- Status: active, completed
- Progress (0-100)
- Start date (optional)
- End date (optional)
- Color (optional, HEX format)

### Project Operations
- Create project
- Update project
- Delete project
- Mark as completed
- View project details
- View project tasks
- Add subtasks (deprecated - use tasks with project_id)

### Project Progress
- Automatically calculated from tasks
- Progress = (completed tasks / total tasks) * 100
- Display progress bar

## Contexts

### Purpose
Situational organization (where, with what tool, with whom)

### Properties
- Name (required, max 100 chars, unique per user)
- Description (optional)
- Icon (emoji, optional)
- Color (optional, HEX format)

### Operations
- CRUD operations (Create, Read, Update, Delete)
- Filter tasks by context

## Areas of Responsibility

### Purpose
High-level life categories (Career, Health, Family, etc.)

### Properties
- Name (required, max 100 chars, unique per user)
- Description (optional)
- Color (optional, HEX format)

### Operations
- CRUD operations (Create, Read, Update, Delete)
- Filter tasks/projects by area
- Assign projects to areas

## Tags

### Purpose
Flexible categorization (Work, Personal, Urgent, etc.)

### Properties
- Name (required, max 100 chars, unique per user)
- Color (optional, HEX format)

### Operations
- CRUD operations (Create, Read, Update, Delete)
- Assign multiple tags to tasks
- Filter tasks by tags

## Subtasks

### Purpose
Break down complex tasks into smaller steps

### Properties
- Title (required, max 200 chars)
- Completed status
- Display order

### Operations
- Create subtask
- Update subtask
- Delete subtask
- Toggle completion
- Reorder subtasks

## GTD Workflow

### 1. Capture (Inbox)
- Quick capture with minimal input (title only)
- Batch capture multiple tasks
- Auto-assign status: inbox

### 2. Clarify (Process)
- Edit inbox items
- Add details (description, project, context, tags, due date)
- Move to active, waiting, or someday
- Delete irrelevant items

### 3. Organize
- Assign to projects
- Set contexts and areas
- Apply tags
- Mark as next action if ready

### 4. Engage (Execute)
- Focus on next actions
- Complete tasks
- Update waiting status

### 5. Review (Weekly)
- Review all inbox items
- Review project progress
- Select next actions
- Review someday/maybe items
- Clean up completed tasks

## Real-time Features

### Server-Sent Events (SSE)
- Real-time notification stream
- Endpoint: `/api/v1/notifications/stream`
- Client reconnects automatically
- Heartbeat messages (optional)

### Polling Fallback
- Activates if SSE unavailable (>30s timeout)
- Checks for new notifications every 30s
- Notifies user if polling active >5min
- Attempts to restore SSE every 60s

### Notification Management
- View all notifications
- View unread notifications
- View task-specific notifications
- Mark as read (single/all)
- Badge counters in UI

## Mobile Responsiveness

### Layout Adaptations
- Bottom navigation on mobile
- Collapsible sidebar
- Touch-friendly components
- Responsive grids and lists

### Performance
- Optimized images
- Lazy loading
- Minimal JavaScript bundle
- Fast initial load

## Data Management

### Export
- Export tasks to JSON
- Export projects to JSON
- Export all data

### Import
- Import from JSON
- Validate data structure
- Handle conflicts (merge/replace)

### Cleanup
- Soft delete with recovery period
- Permanent delete after N days (configurable)
- Batch operations

## User Experience

### Onboarding
- Quick setup guide
- Create first task
- Create first project
- Import sample data (optional)

### Shortcuts (Desktop)
- Quick capture hotkey (e.g., Ctrl+K)
- Navigation shortcuts
- Task action shortcuts

### Dark Mode
- Automatic system detection
- Manual toggle
- Persist preference
