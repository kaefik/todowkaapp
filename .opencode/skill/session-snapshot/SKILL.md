---
name: session-snapshot
description: >
  Capture or restore the full state of a development session after context reset or break.
  Use when the user says "сохрани сессию", "запомни где мы остановились",
  "save session", "restore session", "где мы остановились", "resume from last snapshot",
  "что мы делали", "восстанови контекст", "I lost my context", "continue where we left off".
  Produces a self-contained snapshot file that restores full working context in one paste.
---

# Session Snapshot

Capture or restore session state. A snapshot is a single Markdown file that,
when pasted into a new session, restores full context in one step.

---

## When to Save

- Context window approaching limit
- Break > 2 hours
- Switching LLM tools or machines
- Before a risky operation (migration, refactor)
- End of work block
- Task Executor reaches 25% / 50% / 75% / 100% milestone (auto-suggest)

---

## MODE: SAVE

"сохрани сессию", "save session", "snapshot"

### Step 1 — Gather state

Read: `00-guide.md`, `_progress.json`, `_context.json` (if exists), `plan/*-design.md`

Ask:
1. "Что делали в этой сессии?" (1–3 предложения)
2. "Что сейчас IN_PROGRESS или только завершено?"
3. "Нерешённые вопросы / блокеры?"

### Step 2 — Write snapshot

Save to: `tasks/{DATE}/_snapshot-{TIMESTAMP}.md`

```markdown
# Session Snapshot
Project: {name} | Date: {DATE} {TIME}
Progress: {X}/{Y} tasks done ({%}%) | Tests: {A}/{B} ({C}%)

---

## Where We Are

{1–3 sentences: what was accomplished this session}

Current task: {task ID and title, or "all done"}
Last completed: {task ID and title}
Blocked on: {blocker, or "nothing"}

---

## Task Status

### Done ({n})
- L0/01 — Init project
- {list}

### In Progress
- L2/01 — UserService (started, ~50% done)

### Ready (by priority score)
- L2/02 — ProductService   Score: 6.0
- L3/01 — POST /users      Score: 4.0

### Blocked
- L5/01 — Email integration  [no SMTP creds]

---

## Architecture

{Key sections from 00-guide.md: tech stack, conventions, key decisions}

---

## Artifacts Built

{Content of _context.json global_context + top artifacts summary}

Tables: users, products, {list}
Services: UserService, {list}
Endpoints live: POST /users, {list}

---

## Open Questions

1. {unresolved decision}
2. {unresolved decision}

---

## How to Resume

Paste this snapshot at the start of a new session:
> "Вот снэпшот нашей сессии. Прочитай и скажи, что следующий шаг."

---

Source files:
- Design: plan/{DATE}-design.md
- Tasks: tasks/{DATE}/
- Progress: tasks/{DATE}/_progress.json
```

Confirm: "✅ Снэпшот: `tasks/{DATE}/_snapshot-{TIMESTAMP}.md`"

---

## MODE: RESTORE

"восстанови сессию", "resume", or user pastes snapshot

1. Parse snapshot (inline or from file)
2. Quick verify: check `_progress.json` matches snapshot
3. Report:

```
🔁 Resumed — {project}
Progress: {X}/{Y} | Tests: {A}/{B}

🎯 Resume point: {current task}
🟢 Ready (by priority): {list with scores}
❓ Open questions: {list}

Say "следующая задача" to continue.
```

4. Hand off to Task Executor NEXT mode

---

## Auto-Suggest Triggers

Task Executor should suggest saving when:
- Progress reaches 25% / 50% / 75% / 100%
- A BLOCKER is encountered
- An L-effort task completes

Format: "💾 Milestone: 50% done. Сохранить снэпшот? (рекомендуется)"

---

## Rules

1. **Snapshot must be self-contained** — pasting it should restore enough context without any other files
2. **Keep under 2000 tokens** — snapshots are pasted into new sessions
3. **Include open questions** — a snapshot without unresolved decisions is incomplete
4. **Never delete snapshots** — they are a project history; use latest one when restoring
