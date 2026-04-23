# Default Section Setting

## Summary

Add a user preference for choosing which section opens by default when the app loads. Currently hardcoded to `/inbox`. The setting is stored on the server (User model) for cross-device sync and cached in localStorage for instant redirect on load.

## Backend Changes

### Model: `User` (`backend/app/models/user.py`)

Add field:
```python
default_section: Mapped[str] = mapped_column(String(30), default='inbox', nullable=False)
```

### Schemas (`backend/app/schemas/user.py`)

- `UserResponse`: add `default_section: str = 'inbox'`
- `UserUpdate`: add `default_section: str | None = Field(default=None, max_length=30)` with a validator that checks against the allowed list:
  ```
  inbox, active, today, tomorrow, next, waiting, someday, completed, trash, projects, contexts, areas, tags
  ```

### Migration

`alembic revision --autogenerate -m "add default_section to user"`

## Frontend Changes

### API (`frontend/src/api/users.ts`)

- Add `default_section: string` to `User` interface
- Update `updateCurrentUser` to accept `default_section`

### Routing (`frontend/src/router.tsx`)

Replace the hardcoded index redirect:
```tsx
{ index: true, element: <Navigate to="/inbox" replace /> }
```
With a `DefaultSectionRedirect` component that reads `default_section` from localStorage (key `default-section`) and redirects to that path. Falls back to `'inbox'` if not set. No API call — uses cached value for instant redirect.

### Settings Page (`frontend/src/routes/Settings.tsx`)

Add a "Начальная страница" section on the "Общие" tab, before "Внешний вид":

- `<select>` dropdown with `<optgroup>` groups matching the sidebar structure:
  - **GTD:** Входящие (inbox), Активные (active), Сегодня (today), Завтра (tomorrow), Next Actions (next), Ожидание (waiting), Когда-нибудь (someday)
  - **Просмотр:** Завершённые (completed), Корзина (trash)
  - **Управление:** Проекты (projects), Контексты (contexts), Области (areas), Теги (tags)
- On change: save to localStorage immediately + send `PATCH /api/users/me` with `{ default_section }` to server
- Show current value from `user?.default_section ?? 'inbox'`

### Auth Store (`frontend/src/stores/authStore.ts`)

When `setCurrentUser` is called, also cache `default_section` to localStorage key `default-section`. This ensures the value is available for the router before any API call completes.

## Allowed Values

| Route path | Label | Group |
|---|---|---|
| `inbox` | Входящие | GTD |
| `active` | Активные | GTD |
| `today` | Сегодня | GTD |
| `tomorrow` | Завтра | GTD |
| `next` | Next Actions | GTD |
| `waiting` | Ожидание | GTD |
| `someday` | Когда-нибудь | GTD |
| `completed` | Завершённые | Просмотр |
| `trash` | Корзина | Просмотр |
| `projects` | Проекты | Управление |
| `contexts` | Контексты | Управление |
| `areas` | Области | Управление |
| `tags` | Теги | Управление |

## Data Flow

1. User logs in → `fetchCurrentUser()` → server returns `default_section`
2. `setCurrentUser()` caches `default_section` to localStorage
3. Router index route → `DefaultSectionRedirect` reads localStorage → redirects instantly
4. User changes setting → saved to localStorage + sent to server via PATCH
5. Next login on any device → server returns updated `default_section`

## Edge Cases

- **Invalid value in localStorage:** Fall back to `'inbox'` if the value is not in the allowed list
- **No localStorage value yet (first login):** Fall back to `'inbox'`
- **Server unreachable:** localStorage cache ensures redirect still works
