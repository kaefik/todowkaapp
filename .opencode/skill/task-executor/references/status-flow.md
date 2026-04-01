# Task Status State Machine

## States

| Status | Meaning |
|--------|---------|
| `PENDING` | Created but not yet analyzed for dependencies |
| `BLOCKED` | Has unfinished dependencies — cannot start |
| `READY` | All dependencies done — can start now |
| `IN_PROGRESS` | LLM prompt generated, user is working on it |
| `DONE` | Completed, output confirmed by user |
| `SKIPPED` | Intentionally skipped (e.g. not applicable) |

## Transitions

```
PENDING ──► BLOCKED    (on import, if has unfinished deps)
PENDING ──► READY      (on import, if no deps or all deps DONE)
BLOCKED ──► READY      (when all dependencies reach DONE)
READY   ──► IN_PROGRESS (when prompt is generated)
IN_PROGRESS ──► DONE   (when user confirms completion)
IN_PROGRESS ──► READY  (if user wants to pause and come back)
DONE    ──► [triggers READY on dependents]
ANY     ──► SKIPPED    (user decision)
```

## Visual Flow

```
[IMPORT]
   │
   ▼
PENDING → analyze deps
   │
   ├─ has deps? ──YES──► BLOCKED
   │                        │
   └─ no deps?  ──NO──► READY ◄──────────────────┐
                            │                     │
                     [user picks task]            │
                            │                     │
                            ▼                     │
                       IN_PROGRESS          [deps completed]
                            │                     │
                     [user confirms done]          │
                            │                     │
                            ▼                     │
                          DONE ───────────────────┘
                            │
                    [check dependents]
                            │
                   ▼ unlock if all deps DONE
```

## Dependency Resolution Algorithm

When task T is marked DONE:
1. Find all tasks where `depends_on` contains T's ID
2. For each such task D:
   a. Get all of D's dependencies
   b. Check if ALL of them are DONE
   c. If yes → set D.status = READY
   d. If no → D stays BLOCKED

## Priority Order for NEXT task

When multiple tasks are READY, pick in this order:
1. Lowest layer number (Foundation=0 before Data=1 before API=3)
2. Within same layer: smallest effort first (XS before S before M before L)
3. If still tied: creation order (FIFO)

## Progress Display Format

```
Progress: ████████░░░░░░░░  8/20 tasks done (40%)

✅ DONE (8):      F-01, F-02, D-01, D-02, D-03, B-01, A-01, A-02
🔄 IN PROGRESS:   A-03 — POST /auth/login endpoint
🟢 READY (3):     A-04, A-05, V-01
🔒 BLOCKED (9):   [waiting on A-03, A-04, A-05]
```
