# Quick Start Guide

This document provides a quick overview for developers/LLMs to understand the project requirements.

## What is this project?

A full-stack task management application implementing GTD (Getting Things Done) methodology with:
- **User authentication** (JWT with refresh tokens)
- **Task management** (CRUD with GTD statuses)
- **Project organization** (with progress tracking)
- **Flexible tagging** (contexts, areas, tags)
- **Real-time notifications** (SSE)
- **Recurring tasks** (daily, weekly, monthly, yearly)
- **Multi-device support** (session management)

## Minimum Requirements

### Backend
- REST API with JWT authentication
- Database (PostgreSQL recommended)
- Background task processing (for reminders/recurrence)
- Real-time notifications (SSE support)

### Frontend
- Modern SPA framework (React, Vue, Angular)
- State management
- Forms validation
- Real-time updates (SSE client)

## Data Models (Simplified)

**Core entities:**
- `users` - User accounts
- `refresh_tokens` - Session management
- `tasks` - Main task entity
- `projects` - Group tasks
- `contexts` - Situational organization
- `areas` - High-level categories
- `tags` - Flexible tags
- `notifications` - Task reminders

**Key relationships:**
- Each user has isolated data (user_id on all tables)
- Tasks belong to users, projects, contexts, areas, tags
- Projects belong to users and areas
- All tables have created_at, updated_at

## API Endpoints Summary

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/login` - Login, get tokens
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Current user
- `GET /auth/sessions` - All sessions
- `DELETE /auth/sessions/all` - Revoke all sessions
- `DELETE /auth/sessions/{id}` - Revoke session

### Tasks
- `GET /tasks` - List with filters/pagination
- `POST /tasks` - Create task
- `GET /tasks/{id}` - Get task
- `PUT /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete (soft delete)
- `POST /tasks/{id}/complete` - Mark completed
- `POST /tasks/{id}/next-action` - Toggle next action
- `POST /tasks/{id}/waiting` - Set waiting for
- `POST /tasks/{id}/recurrence` - Set recurrence

### Other
- `POST /inbox` - Quick capture
- `GET/POST/PUT/DELETE /projects` - Project CRUD
- `GET/POST/PUT/DELETE /contexts` - Context CRUD
- `GET/POST/PUT/DELETE /areas` - Area CRUD
- `GET/POST/PUT/DELETE /tags` - Tag CRUD
- `GET /notifications` - List notifications
- `POST /notifications/{id}/read` - Mark read
- `GET /notifications/stream` - SSE stream

## Authentication Requirements

### Access Token (JWT)
- **Purpose:** API requests
- **Expiration:** 15 minutes
- **Storage:** HttpOnly cookie
- **Payload:** user_id, email, session_id

### Refresh Token
- **Purpose:** Get new access token
- **Expiration:** 30 days
- **Storage:** Database (hashed) + HttpOnly cookie
- **Rotation:** Issue new, revoke old on refresh

### Cookie Requirements
- **access_token:** HttpOnly, Secure, SameSite=Lax, Path=/
- **refresh_token:** HttpOnly, Secure, SameSite=Lax, Path=/api/v1/auth/refresh

### Security
- Password hashing (bcrypt/argon2)
- Token validation on every request
- User isolation (all queries filtered by user_id)
- Rate limiting on auth endpoints

## GTD Workflow

### Task Statuses
- `inbox` - Uncaptured, unprocessed
- `active` - Ready to do
- `completed` - Finished
- `waiting` - Waiting for someone
- `someday` - Maybe later

### Priority Levels
- `low`
- `medium`
- `high`

### Recurrence Types
- `none`
- `daily`
- `weekly` (with days_of_week)
- `monthly` (with day_of_month)
- `yearly` (with day_of_month + month)

### Weekly Review
- Process all inbox items
- Review project progress
- Select next actions
- Review someday items
- Clean up completed tasks

## Real-time Notifications

### SSE Stream
- **Endpoint:** `GET /notifications/stream`
- **Format:** Server-Sent Events
- **Reconnect:** Auto-reconnect on disconnect
- **Fallback:** Poll every 30s if unavailable

### Notification Types
- Task due reminder
- Task overdue alert
- Recurring task created
- Session activity (optional)

## Frontend Requirements

### Pages
- `/login` - Login form
- `/register` - Registration form
- `/` - Dashboard
- `/inbox` - Process inbox items
- `/tasks` - Task list with filters
- `/projects` - Project list
- `/contexts` - Context management
- `/areas` - Area management
- `/tags` - Tag management
- `/notifications` - Notification center

### Components
- Task list with filters (status, priority, project, context, area, tags, search)
- Task form (create/edit)
- Quick capture (minimal input)
- Project card with progress bar
- Notification dropdown with badge
- Sidebar navigation
- Bottom navigation (mobile)

### State Management
- Auth state (user, isAuthenticated)
- Task state (selected task, filters)
- Notification state (unread count)
- Navigation state (current view)

### Data Fetching
- Use TanStack Query or similar
- Implement optimistic updates
- Cache management
- Automatic refetch on background

## Implementation Priority

### Phase 1: Foundation
1. Database schema setup
2. User authentication (register, login, logout)
3. Basic task CRUD
4. Project CRUD

### Phase 2: GTD Features
1. Inbox quick capture
2. Task filtering and search
3. Contexts, areas, tags
4. Task status workflow

### Phase 3: Advanced Features
1. Real-time notifications (SSE)
2. Recurring tasks
3. Background task processing
4. Session management

### Phase 4: Polish
1. Weekly review workflow
2. Progress calculation
3. Performance optimization
4. Testing and deployment

## Technology Stack Recommendations

### Backend
- **Python:** FastAPI + SQLAlchemy + Celery + Redis
- **Node.js:** Express/NestJS + TypeORM/Prisma + Bull + Redis
- **Go:** Gin/Echo + GORM + Asynq + Redis

### Frontend
- **React:** Next.js + Zustand + TanStack Query + Tailwind
- **Vue:** Nuxt 3 + Pinia + VueUse + UnoCSS
- **Angular:** Angular 17+ + NgRx + Signals + Angular Material

### Database
- **Production:** PostgreSQL
- **Development:** SQLite (for simplicity)

## Security Checklist

- [ ] Password hashing (bcrypt/argon2)
- [ ] JWT token validation
- [ ] HttpOnly cookies
- [ ] CSRF protection (SameSite)
- [ ] Rate limiting
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] User data isolation
- [ ] HTTPS in production
- [ ] Environment variables for secrets

## Performance Checklist

- [ ] Database indexes on frequently queried columns
- [ ] Pagination for large datasets
- [ ] Response caching (where appropriate)
- [ ] Lazy loading for relationships
- [ ] Optimistic updates on frontend
- [ ] Code splitting on frontend
- [ ] Image optimization
- [ ] Compression (gzip)

## Testing Checklist

- [ ] Unit tests for services
- [ ] Unit tests for components
- [ ] Integration tests for API
- [ ] E2E tests for critical flows
- [ ] Test coverage >80%
- [ ] CI/CD pipeline

## Documentation Checklist

- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema documentation
- [ ] Authentication flow documentation
- [ ] GTD workflow documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide

## Common Pitfalls to Avoid

1. **Hardcoding user_id** - Always get from authentication context
2. **Missing user isolation** - Filter all queries by user_id
3. **Storing tokens in localStorage** - Use HttpOnly cookies
4. **Not implementing refresh token rotation** - Always issue new token
5. **Hard deleting tasks** - Use soft delete with deleted_at
6. **Forgetting to update project progress** - Calculate dynamically
7. **Not handling timezone** - Store in UTC, convert client-side
8. **Missing error boundaries** - Handle errors gracefully
9. **Not optimizing queries** - Use indexes and pagination
10. **Ignoring mobile** - Make responsive design

## Quick Start Commands

### Backend (Python/FastAPI example)
```bash
# Setup
pip install fastapi uvicorn sqlalchemy celery redis
cp .env.example .env

# Database
alembic upgrade head

# Run
uvicorn app.main:app --reload

# Background tasks
celery -A app.services.reminders worker --loglevel=info
celery -A app.services.reminders beat --loglevel=info
```

### Frontend (Next.js example)
```bash
# Setup
npm install
cp .env.local.example .env.local

# Run
npm run dev

# Build
npm run build

# Test
npm run lint
npm run typecheck
```

## Key Files Reference

- `README.md` - Project overview
- `FEATURES.md` - Detailed feature requirements
- `DATABASE.md` - Complete database schema
- `API.md` - Full API specification
- `AUTHENTICATION.md` - JWT and refresh token details
- `GTD_WORKFLOW.md` - Business logic
- `ARCHITECTURE.md` - System architecture

## Questions?

If something is unclear:
1. Check the detailed documentation files
2. Review the original project code (if available)
3. Ask for clarification on specific requirements

**Remember:** This specification provides flexibility in technology choices while maintaining functional requirements.
