# Platform-Specific Task Patterns

Reference for generating task breakdowns per target platform.
Use the relevant section when writing TASKS-[PLATFORM].md.

---

## CLI / Terminal

**Philosophy**: Everything is text. State lives in files or environment. Composition over monolith.

### Foundation Tasks (always include)
- Project scaffold: language choice, dependency manager, entry point
- Argument parsing: flags, subcommands, help text
- Config file support: read from `~/.config/[app]/config.toml` or similar
- Stdin/stdout/stderr discipline
- Exit codes (0 = success, non-zero = error with meaning)
- `--version` and `--help` flags

### UI Patterns for CLI
- Progress bars / spinners for long operations (use a library: `rich`, `tqdm`, `ora`, etc.)
- Colored output (but respect `NO_COLOR` env var)
- Table output for lists (consider `--json` flag for machine-readable output)
- Interactive prompts for missing required input (use `inquirer`, `survey`, `dialoguer`, etc.)
- Pager for long output (`less`-style)

### State & Storage
- User data: `~/.local/share/[app]/` (XDG) or `~/.config/[app]/`
- Temp files: system temp dir
- Databases: SQLite is the default choice for local persistence
- Secrets: system keychain or env vars (never plaintext files)

### Distribution
- Single binary if possible (Go, Rust, PyInstaller)
- Or: package manager (npm, pip, homebrew, cargo)
- Shell completion scripts (bash, zsh, fish)
- Man page

### Common Task Patterns
```
Task: Implement [Feature X] as subcommand
- Define subcommand name and aliases
- Define flags/args with help text
- Implement logic from PORT-DOC §4
- Format output (table / JSON / plain)
- Add to --help
```

---

## Web (Browser)

**Philosophy**: Progressive enhancement. Works without JS for core paths where possible. Fast first load.

### Foundation Tasks (always include)
- Framework choice (React / Vue / Svelte / vanilla)
- Routing setup (SPA vs MPA vs hybrid)
- State management approach
- API layer / data fetching setup
- Auth strategy (JWT / session / OAuth)
- CSS approach (Tailwind / CSS Modules / styled-components)
- Build tooling (Vite / Next.js / Astro)

### UI Component Patterns
- Component for each major UI area in PORT-DOC user flows
- Form components with validation matching PORT-DOC business rules
- Loading states for every async operation
- Error boundaries / error states for every component
- Empty states
- Responsive layouts (mobile-first)

### State & Storage
- Server state: React Query / SWR / tRPC / etc.
- Client state: Zustand / Jotai / Redux (keep minimal)
- Persisted client state: localStorage / IndexedDB
- URL state: for shareable/bookmarkable views

### Backend (if full-stack web)
- REST or GraphQL API design
- Database schema from PORT-DOC §3
- Auth middleware
- Input validation (server-side)
- Rate limiting
- Error response format

### Common Task Patterns
```
Task: Build [Feature X] page/component
- Create route
- Fetch data from API (or PORT-DOC data model)
- Implement UI per user flow
- Implement form validation per business rules
- Handle loading / error / empty states
- Add to navigation
```

---

## Mobile (iOS / Android / Cross-platform)

**Philosophy**: Offline-first. Native feel. Battery and data conscious. Touch-optimized.

### Foundation Tasks (always include)
- Framework choice: React Native / Flutter / Swift / Kotlin / Expo
- Navigation structure (stack / tab / drawer)
- State management
- Local storage strategy (AsyncStorage / SQLite / Realm / Hive)
- API client with offline queue
- Push notification setup (if needed)
- App icon, splash screen, permissions

### UI Patterns for Mobile
- Follow platform conventions (iOS: HIG, Android: Material)
- Bottom tab navigation for primary sections
- Stack navigation for detail views
- Pull-to-refresh for lists
- Infinite scroll / pagination
- Gesture handling (swipe to delete, etc.)
- Keyboard avoidance
- Safe area handling (notch, home indicator)

### Offline & Sync
- Cache API responses
- Queue mutations when offline
- Sync on reconnect
- Conflict resolution strategy

### Platform Differences to Note
| Feature | iOS notes | Android notes |
|---------|-----------|---------------|
| Storage | Keychain for secrets | Keystore for secrets |
| Notifications | APNs | FCM |
| Payments | StoreKit | Play Billing |
| Deep links | Universal Links | App Links |

### Common Task Patterns
```
Task: Implement [Feature X] screen
- Create screen component
- Add to navigator
- Implement data fetching with offline fallback
- Build UI per PORT-DOC user flow §5
- Handle touch interactions
- Handle keyboard / scroll behavior
```

---

## Desktop (Native App)

**Philosophy**: Leverage OS features. Integrate with file system and notifications.

### Framework Options
- **Electron**: Web tech, large binary, wide ecosystem
- **Tauri**: Web tech, small binary, Rust core
- **Qt / wxWidgets**: True native, complex
- **Swift/AppKit** (macOS only): Best native feel
- **WPF/WinUI** (Windows only): Best native feel
- **Flutter Desktop**: One codebase, decent native feel

### Foundation Tasks
- Window management (size, position, min/max)
- Menu bar (native menus)
- System tray (if background app)
- Auto-updater
- Installers / packaging
- Deep OS integration (file associations, URL schemes)

### Storage
- App data: OS-standard paths (AppData, ~/Library, ~/.local)
- SQLite for structured data
- Native keychain for secrets

---

## API / Backend Service

**Philosophy**: Stateless where possible. Versioned. Documented.

### Foundation Tasks
- Framework choice (Express / FastAPI / Gin / Actix / NestJS / etc.)
- OpenAPI / Swagger spec (derive from PORT-DOC §2 features)
- Auth strategy (API keys / JWT / OAuth2)
- Database setup (schema from PORT-DOC §3)
- Migrations
- Environment config (.env, secrets management)
- Health check endpoint
- Logging / observability
- Rate limiting
- CORS (if consumed by web)

### Endpoint Design
For each feature in PORT-DOC §2, derive endpoints:
- Resource naming (nouns, plural)
- HTTP methods (GET list, GET detail, POST create, PUT/PATCH update, DELETE)
- Request/response schemas
- Pagination for lists
- Filtering/sorting params

### Common Task Patterns
```
Task: Implement [Feature X] endpoint(s)
- Define route(s)
- Input validation per PORT-DOC business rules
- Implement logic from PORT-DOC §4
- Write to DB (PORT-DOC §3 models)
- Return response
- Write tests
```

---

## Cross-Platform / "All Versions"

If user wants all platforms, suggest this phased approach:

**Phase 1 — Core** (shared across all):
- PORT-DOC §4 business logic as a pure library (no UI, no I/O)
- Data models and validation
- Test suite for core logic

**Phase 2 — API** (enables all other clients):
- REST API wrapping core library
- Database layer
- Auth

**Phase 3 — Clients** (pick order by priority):
- CLI (fastest to build, good for power users)
- Web (broadest reach)
- Mobile (best engagement)
- Desktop (best for power workflows)

**Monorepo structure suggestion**:
```
[project]/
├── core/          ← Pure business logic, shared
├── api/           ← Backend API
├── web/           ← Web client
├── mobile/        ← Mobile app
├── cli/           ← CLI tool
└── desktop/       ← Desktop app
```
