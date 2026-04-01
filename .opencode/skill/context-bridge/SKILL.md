---
name: context-bridge
description: >
  Capture and pass structured output context from completed tasks to the next task prompt.
  Use when Task Executor asks for previous task output and the user wants automation,
  when context is lost between sessions, when the user says "запомни результат задачи",
  "сохрани контекст", "передай результат дальше", "context is getting lost",
  "save task output", "bridge context between tasks".
  Maintains _context.json artifact registry alongside Task Executor.
---

# Context Bridge

Structured artifact registry that flows context automatically between tasks.
Eliminates the "paste your previous task output" problem.

---

## The Problem

Task Executor generates prompts for each task, but LLMs have no memory between sessions.
For 30+ tasks, manually pasting previous outputs becomes error-prone and tedious.

**Solution:** `tasks/{DATE}/_context.json` — every completed task writes its outputs,
every new task reads exactly what it needs.

---

## `_context.json` Structure

```json
{
  "project": "my-app",
  "updated": "2025-03-15T10:00:00Z",
  "global_context": {
    "db_driver": "drizzle-orm",
    "db_type": "postgresql",
    "auth_strategy": "JWT with refresh tokens",
    "api_style": "REST",
    "error_format": "{ error: string, code: string }",
    "port": 3000,
    "log_format": "structured JSON (pino)"
  },
  "artifacts": {
    "L0/01-init-project": {
      "task": "Init project & env config",
      "completed": "2025-03-15T09:00:00Z",
      "outputs": {
        "project_root": "/home/user/my-app",
        "package_manager": "pnpm",
        "framework": "Hono",
        "key_dependencies": ["hono", "drizzle-orm", "zod", "pino"]
      },
      "notes": "ESM only. pnpm workspaces."
    },
    "L1/01-user-schema": {
      "task": "Create User schema",
      "completed": "2025-03-15T09:45:00Z",
      "outputs": {
        "schema_file": "src/db/schema/users.ts",
        "table_name": "users",
        "fields": ["id", "email", "password_hash", "role", "created_at"]
      },
      "notes": "Email UNIQUE. Role enum: admin|user."
    }
  }
}
```

---

## Integration with Task Executor

### On MODE: DONE (extension)

After Task Executor marks a task done, run Context Bridge CAPTURE:

Ask: "Какие артефакты создала эта задача?"

Capture by layer type:

**L0 Foundation:** project root, package manager, runtime version, framework, key deps, env vars
**L1 Data Layer:** schema file, table name, all fields + types + constraints, migration file
**L2 Business:** service file, key functions (name + inputs + outputs), business rules, error types
**L3 API:** endpoint (METHOD /path), auth required, request body, response shape, status codes
**L4 Auth:** middleware location, token format/location, protected route pattern, role names
**L5 Integration:** service name, client file, key methods, error handling approach
**L6 Validation:** library used, schema paths, error response format
**L7 Tests:** runner, config, file naming pattern, coverage %
**L8 Docs/Deploy:** API docs URL, deploy command, production env vars
**L9 Observability:** logging lib + format, metrics tool, tracing setup, alert rules file

Write to `_context.json`. Always merge `global_context`, never overwrite.

### On MODE: PROMPT (extension)

Before generating the LLM prompt:

1. Read `_context.json`
2. Read task's `depends_on` list
3. Extract outputs from all dependency tasks + global_context
4. Format as injection block (keep under 400 tokens):

```
=== CONTEXT FROM COMPLETED TASKS ===

[L0/01-init-project]
- Framework: Hono, PM: pnpm, Node: 20, ESM only
- Dependencies: hono, drizzle-orm, zod, pino

[L1/01-user-schema]
- File: src/db/schema/users.ts
- Table: users, PK: id (uuid)
- Fields: id, email(UNIQUE), password_hash, role(admin|user), created_at

[GLOBAL]
- DB: PostgreSQL + drizzle-orm
- Auth: JWT with refresh tokens
- Error: { error: string, code: string }
- Logging: pino, structured JSON
```

---

## MODE: CAPTURE — Save Task Output

"запомни результат", "сохрани контекст", or auto from Task Executor DONE.

1. Identify task (current IN_PROGRESS or specified)
2. Prompt for structured outputs (by layer type — see above)
3. Write to `_context.json`, confirm: "✅ [N] артефактов в реестре."

---

## MODE: REVIEW — Show Context

"покажи контекст", "что уже известно"

```
📦 Context Registry — my-app (6 artifacts)

GLOBAL:
  DB: PostgreSQL + drizzle-orm
  Auth: JWT | Error: { error, code }
  Logging: pino JSON

ARTIFACTS:
  ✅ L0/01 — Hono, pnpm, ESM
  ✅ L1/01 — users (id, email, password_hash, role)
  ✅ L2/01 — UserService: create, findByEmail, updatePassword
```

---

## Key Rules

1. **Never overwrite `global_context`** — always merge
2. **Keep injection block under 400 tokens** — context in prompts must stay tight
3. **Structured data over prose** — `"fields": ["id", "email"]` beats description
4. **Warn if task has no captured output** — don't silently skip
5. **Context Bridge is optional** — Task Executor works without it; enable per project
