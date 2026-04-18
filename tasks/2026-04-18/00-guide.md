# Execution Guide — Todowka Offline (Local-first на Dexie.js)
Generated: 2026-04-18

## Project Context

Перевод GTD-менеджера Todowka на local-first архитектуру с Dexie.js (IndexedDB). Dexie становится единственным источником истины на клиенте. React Query удаляется. Добавляется SyncEngine для фоновой синхронизации с бекендом. Бекенд минимально меняется — принимает client-provided UUID.

## Tech Stack

- **Language:** TypeScript (frontend), Python 3.12+ (backend)
- **Framework:** React 19 + Vite 8 (frontend), FastAPI (backend)
- **DB:** IndexedDB via Dexie.js (frontend), SQLite + SQLAlchemy 2.0 (backend)
- **Auth:** JWT (access + refresh token), unchanged
- **State:** Zustand (auth, toast), Dexie useLiveQuery (data)
- **Testing:** Vitest (frontend), pytest (backend)
- **Sync:** Custom SyncEngine (push/pull, LWW conflict resolution)

## Execution Style

```
execution_style: careful
```

Careful = small steps, verify each output before proceeding. Each task produces a complete file. Run lint/typecheck after each task.

## Code Conventions

- **Frontend naming:** camelCase for variables/functions, PascalCase for components, snake_case for API fields
- **File structure:** `frontend/src/db/` for Dexie layer, `frontend/src/hooks/` for React hooks
- **Import style:** ES modules, named exports
- **Types:** All data structures typed, no `any`
- **Backend:** snake_case, Pydantic v2 models, async/await everywhere

## Output Format Rules (for LLM)

- Always return complete files, never diffs or partial code
- Always include all imports
- No TODO comments, no placeholders
- Follow the exact Output and Done-when from each task card
- Use the code from the design document `docs/plans/offline/2026-04-18-offline-v3.md` as reference

## Error Handling Convention

- Frontend: throw `ApiError` for HTTP errors, never swallow silently
- SyncEngine: log errors, retry with backoff, stop on network errors
- Backend: standard HTTP error codes, JSON `{detail: "message"}`

## Environment Variables

No new environment variables required.

## Key Reference Files

- Design document: `docs/plans/offline/2026-04-18-offline-v3.md`
- Current hooks: `frontend/src/hooks/useTasks.ts`, `useProjects.ts`, `useTags.ts`, `useAreas.ts`, `useContexts.ts`
- Current schemas: `backend/app/schemas/task.py`, `project.py`, `area.py`, `context.py`, `tag.py`
- Main entry: `frontend/src/main.tsx`
- HTTP client: `frontend/src/api/httpClient.ts`

## Skipped Layers

- **L4 (Auth & Security):** Auth flow unchanged. JWT, refresh tokens, rate limiting remain as-is.
- **L6 (Validation & Errors):** Validation stays with Pydantic (backend) and Zod (frontend). Error handling embedded in syncEngine tasks.
- **L9 (Observability):** Skipped for this feature. App already has console.debug logging. Production observability (structured logging, metrics) can be added as a separate initiative.

## Dependency Graph (simplified)

```
L0-01 (npm install) ──┬──→ L1-01 (database.ts) ──→ L2-01 (conflict) ──→ L2-03 (syncEngine)
L0-02..06 (backend) ──┘          │                  L2-02 (mappers) ──┘       │
                                 L1-02 (migration)                           │
                                 L3-01 (hooks)                               ↓
                                      │                              L3-08 (SyncProvider)
                                      ↓                                    │
                              L3-02..05 (task hooks)                       L3-09 (main.tsx)
                              L3-06..07 (adapt components)                  │
                                                                           ↓
                              L3-11..14 (dict hooks) ──→ L3-15 (syncEngine ext)
                                                                    │
                                                                    ↓
                              L5-01 (init.ts)  L5-02 (logout)
                                                                    │
                                                                    ↓
                              L7-01..03 (tests) → L8-01..06 (cleanup)
```
