---
name: task-executor
description: >
  Execute development tasks stored as files in a Kanban tasks/ folder structure (L0–L9 layers).
  Use this skill whenever the user wants to start or continue development from a file-based
  task plan, says "следующая задача", "запусти задачу", "что дальше", "сгенерируй промпт",
  "начни разработку", "выполни задачу", "задача готова", "отметь выполненной",
  "покажи прогресс", "start next task", "run task", "execute task", "mark done",
  "покажи метрики", "show metrics".
  Works with tasks/ directory using Kanban structure (backlog/ready/in_progress/done/blocked).
  Each task is a separate .md file. Progress tracked via tasks/_progress.json.
  No external task managers needed.
---

# Task Executor — Kanban File-Based Dev Orchestrator

Runs development tasks from a Kanban `tasks/` structure.
Each task = one `.md` file. Physical folder = current status.

---

## Kanban Folder Structure

```
tasks/{DATE}/
├── 00-guide.md           ← LLM execution guide — READ FIRST, ALWAYS
├── _progress.json        ← source of truth for status and metrics
├── backlog/              ← all tasks begin here (not yet ready)
│   ├── L0/01-init-project.md
│   ├── L1/01-user-schema.md
│   └── ...
├── ready/                ← depends_on all DONE, ready to execute
│   └── L0/02-env-config.md
├── in_progress/          ← currently being worked on (max 1–2 at a time)
├── done/                 ← completed, artifact confirmed
│   └── L0/01-init-project.md
└── blocked/              ← external blocker, not a dependency issue
```

**The physical folder IS the status.** Moving a file = changing its status.
`_progress.json` mirrors the folder state — always keep both in sync.

---

## CRITICAL: Always Read 00-guide.md First

**Before doing anything else in any mode**, read `tasks/{DATE}/00-guide.md`.

This file contains:
- Project context and tech stack
- `execution_style: careful | aggressive` — controls how the executor behaves
- Code conventions that override any default behaviour
- Output format rules that go verbatim into every LLM prompt

If `00-guide.md` is missing → ask before proceeding:
"Файл 00-guide.md не найден. Продолжить без него?"

**`execution_style` behaviour:**
- `careful` — present one task at a time, wait for confirmation, include extra verification steps in prompts
- `aggressive` — present next 3 READY tasks, auto-advance, minimal ceremony

---

## Step 0 — First Run Setup

If `tasks/_progress.json` does not exist:

1. **Read `tasks/00-guide.md`**
2. Scan all `tasks/*/` Kanban folders, list every `.md` file
3. Parse each file — extract: title, layer, depends_on, impact, complexity, risk, priority_score, effort
4. Compute `priority_score = (impact × 2 + risk) / complexity` for any task missing it
5. Create `tasks/_progress.json`:

```json
{
  "project": "[infer from 00-guide.md]",
  "created": "2025-03-15T09:00:00Z",
  "updated": "2025-03-15T09:00:00Z",
  "guide": "tasks/00-guide.md",
  "execution_style": "careful",
  "metrics": {
    "total": 24,
    "done": 0,
    "in_progress": 0,
    "ready": 3,
    "blocked": 0,
    "with_tests": 0,
    "pct_done": 0,
    "pct_tested": 0
  },
  "tasks": {
    "L0/01-init-project": {
      "title": "Init project & env config",
      "layer": 0,
      "effort": "S",
      "priority_score": 3.0,
      "depends_on": [],
      "status": "ready",
      "folder": "ready",
      "has_test": false,
      "completed_at": null,
      "completed_output": null
    },
    "L1/01-user-schema": {
      "title": "Create User schema & migration",
      "layer": 1,
      "effort": "S",
      "priority_score": 4.5,
      "depends_on": ["L0/01-init-project"],
      "status": "backlog",
      "folder": "backlog",
      "has_test": false,
      "completed_at": null,
      "completed_output": null
    }
  }
}
```

Status rules on init:
- `depends_on: []` → `ready` (move file to `ready/`)
- Has unfinished `depends_on` → `backlog`

---

## MODE: NEXT — What to Work on Now

Triggered by: "следующая задача", "что дальше", "start next task"

1. Read `00-guide.md` → load `execution_style`
2. Read `_progress.json`
3. Find all tasks in `ready/` folder
4. **Sort by `priority_score` descending** (highest score first)
5. Pick top task (or top 3 if `execution_style: aggressive`)
6. Read the task `.md` file from `ready/`
7. Display:

```
🎯 NEXT: L[N]/[filename]   Score: [X.X]  Effort: [size]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[full task content from .md file]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Layer: [name]  |  Depends on: [list or none]
```

If `execution_style: careful` → ask: "Сгенерировать промпт для этой задачи?"
If `execution_style: aggressive` → auto-generate the prompt immediately

If effort = L → warn: "⚠️ Большая задача (4ч). Хочешь разбить её на подшаги?"

---

## MODE: PROMPT — Generate LLM Prompt

Triggered by: "сгенерируй промпт", "generate prompt", or automatically after NEXT

### Step 1 — Load guide and task
- Read `tasks/00-guide.md` (full content)
- Read the target task `.md` file (full content)

### Step 2 — Collect context

Ask for previous task output **only if** the task has `depends_on` that aren't captured in `_context.json` yet.

If Context Bridge skill is active → auto-inject from `_context.json`.

### Step 3 — Build the prompt

```
=== EXECUTION GUIDE (follow strictly) ===
[full content of 00-guide.md — verbatim, unmodified]

=== CONTEXT FROM COMPLETED TASKS ===
[structured artifact context from _context.json, or user-provided output]

=== YOUR TASK: [task title] (Score: [X.X] | Effort: [size]) ===
[full content of the task .md file]

=== ACCEPTANCE CRITERIA ===
[extracted from task file]

=== REMINDER ===
- Return complete, runnable code only
- No placeholders, no TODO comments
- Follow the exact Output and Done-when specified above
- All acceptance criteria must be met
```

Output the prompt in a fenced code block — ready to copy-paste.

Update `_progress.json`: set this task's status to `in_progress`.
Move file: `ready/L[N]/task.md` → `in_progress/L[N]/task.md`

---

## MODE: DONE — Mark Task Complete

Triggered by: "задача готова", "выполнено", "mark done", "отметь выполненной"

1. Ask: "Какую задачу отмечаем? (или текущую in_progress?)"
2. Ask: "Вставь краткое описание результата (1–2 строки): что было создано?"
3. Ask: "Это задача с тестами? (содержит unit/integration тесты)" → updates `has_test`
4. **Move file**: `in_progress/L[N]/task.md` → `done/L[N]/task.md`
5. Update `_progress.json`:
   - Set status → `done`
   - Set `completed_at` → current ISO timestamp
   - Set `completed_output` → user's summary
   - Set `has_test` → true/false
6. **Dependency resolution**:
   - Find all `backlog` tasks that list this task in `depends_on`
   - For each: if ALL their `depends_on` are `done` → set status `ready`, move file to `ready/`
7. **Update metrics** in `_progress.json`
8. Report:

```
✅ Done: [task title]
📁 Moved to: done/L[N]/task.md
🔓 Unlocked: [newly READY tasks with their priority scores, or "none yet"]

📊 Progress: [X]/[total] done ([%]%)
🧪 Test coverage: [X]/[total] tasks with tests ([%]%)
🟢 Ready now (sorted by score): [list with scores]
```

---

## MODE: BLOCK — Mark Task Blocked

Triggered by: "задача заблокирована", "block task", "внешний блокер"

1. Ask: "Какая задача? Опиши блокер (1 строка)."
2. Move file: `in_progress/` or `ready/` → `blocked/L[N]/task.md`
3. Update `_progress.json`: status → `blocked`, add `blocker: "[description]"`
4. Show next READY task automatically

---

## MODE: PROGRESS — Show Current State + Metrics

Triggered by: "покажи прогресс", "сколько осталось", "статус", "метрики"

```
📊 Progress: ████████░░░░  X/Y done (Z%)
🧪 Test coverage: A/B tasks with tests (C%)

✅ DONE (n):
  L0/01 — Init project                    Score: 3.0
  L1/01 — User schema                     Score: 4.5

🔄 IN PROGRESS (n):
  L2/01 — UserService                     Score: 5.5

🟢 READY (n, sorted by priority):
  L2/02 — ProductService                  Score: 6.0
  L3/01 — POST /users                     Score: 4.0

📦 BACKLOG (n):
  L4/01 — Auth middleware                 (waiting: L2/01)

🔒 BLOCKED (n):
  L5/01 — Email integration              [BLOCKER: no SMTP creds yet]

Layer coverage:
  L0 Foundation:     ██████  2/2  ✅
  L1 Data Layer:     ███░░░  1/3
  L2 Business Logic: █░░░░░  1/4
  L9 Observability:  ░░░░░░  0/2  ⚠️
```

---

## MODE: SCAN — Re-scan and Sync

Triggered by: "пересканируй", "синхронизируй", "задачи изменились"

Re-read all `.md` files from all Kanban folders.
Rebuild `_progress.json` from scratch.
Report: "Найдено [N] задач. [X] расхождений исправлено."

---

## Key Rules

1. **Always read `00-guide.md` before generating any prompt** — it overrides defaults
2. **`00-guide.md` goes verbatim at the top of every LLM prompt** — never summarise
3. **Never generate a prompt for a `backlog` or `blocked` task** — warn and show blockers
4. **Physical folder = status.** Always move the `.md` file when status changes
5. **`_progress.json` and folder state must always match** — run SCAN to fix drift
6. **Sort READY tasks by `priority_score`** — not by layer, not by filename
7. **Always include previous task output as context** — LLMs have no memory
8. **One task = one prompt** — never batch multiple `.md` files into one prompt
9. **After DONE → always show what got unlocked** with their priority scores
10. **Update metrics after every DONE** — keep them fresh

---

## References

- `references/prompt-patterns.md` — LLM prompt templates per task type
- `references/status-flow.md` — Status state machine & dependency resolution
