---
name: design-to-plan
description: >
  Decompose any application or API design document into a granular, LLM-friendly
  step-by-step implementation plan. Use this skill whenever the user provides a
  design document (API design, app architecture, system spec, PRD, technical spec,
  ERD, or any planning document) and asks to break it into tasks, subtasks, a
  roadmap, implementation steps, sprint plan, or execution checklist. Also trigger
  when user says "разбить на задачи", "составить план реализации", "пошаговый план",
  "декомпозировать документ", "break into tasks", "create implementation plan",
  or "how do I implement this design". The output is a structured plan where every
  step is atomic enough for a single LLM prompt or a single developer task (1–4 hours max).
---

# Design → Implementation Plan

Transforms a design document into an **atomic, ordered, prioritised, LLM-processable** task plan.

---

## Core Principle: Atomic Steps

Every output step must be:
- **Self-contained**: completable without reading other steps
- **Verifiable**: has a clear done condition and acceptance criteria
- **Sized right**: 1–4 hours of dev work, or 1 focused LLM prompt
- **Dependency-aware**: `depends_on` explicitly declared
- **Scored**: impact / complexity / risk assessed for prioritisation

---

## Step 1 — Parse the Document

Read the provided document carefully. Extract:

1. **Domain** — what system is being built (API, mobile app, web app, microservice, etc.)
2. **Entities** — data models, resources, objects mentioned
3. **Operations** — CRUD, business logic, flows, integrations
4. **Non-functional requirements** — auth, validation, error handling, performance, security, observability
5. **Dependencies** — external services, libraries, infrastructure
6. **Ambiguities** — anything unclear that needs a decision before coding

If the document is missing critical info (auth strategy, DB choice, deployment target), flag these **before** generating the plan. Ask the user to clarify or make a reasonable assumption and state it explicitly.

---

## Step 2 — Build the Layer Map

Group everything into implementation layers in this order:

```
Layer 0: Foundation        (project setup, config, CI/CD skeleton)
Layer 1: Data Layer        (DB schema, models, migrations, seeders)
Layer 2: Core Business     (services, domain logic, calculations)
Layer 3: API / Interface   (routes, controllers, request/response DTOs)
Layer 4: Auth & Security   (authentication, authorization, middleware)
Layer 5: Integration       (external APIs, queues, webhooks, emails)
Layer 6: Validation & Errors (input validation, error codes, logging)
Layer 7: Tests             (unit, integration, e2e per feature)
Layer 8: Docs & Deployment (API docs, README, deploy scripts)
Layer 9: Observability     (structured logging, metrics, distributed tracing, alerts)
```

**Layer 9 is not optional for production projects.** Skip it only for MVPs/prototypes and say why.
Not all other layers are always needed — skip irrelevant ones and say why.

---

## Step 3 — Generate Atomic Tasks

For each layer, produce tasks following this format:

```markdown
### [LAYER_CODE]-[NUMBER] — [Task Title]

**Goal:** One sentence — what this step produces.
**Input:** What you need before starting (files, data, completed steps).
**Output:** Exact artifact produced (file name, endpoint, schema, etc.).
**Done when:** Concrete, testable condition.
**Acceptance criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
**depends_on:** [L0/01, L1/02] or []
**impact:** 1–5  (1=minor, 5=core feature)
**complexity:** 1–5  (1=trivial, 5=very hard)
**risk:** 1–5  (1=safe, 5=high chance of blocking)
**priority_score:** (impact × 2 + risk) / complexity
**Est. effort:** XS / S / M / L  (XS=30min, S=1h, M=2h, L=4h)
**LLM Prompt Hint:** (optional) How to ask an LLM to do this step efficiently.
```

**Splitting rules:**
- If a task touches more than 1 entity → split per entity
- If a task has more than 3 sub-operations → split into sub-tasks
- If a task requires a decision before implementation → make the decision a separate task (type: `DECISION`)
- If a task is purely documentation → mark as `DOCS`
- If effort = L → flag with warning, suggest splitting further

---

## Step 4 — Task Validation (before writing files)

Before writing any task to disk, validate each task against this checklist:

- [ ] **Atomic?** — does it touch exactly one thing (one entity, one endpoint, one service)?
- [ ] **Unambiguous?** — can a developer start immediately without asking questions?
- [ ] **Has acceptance criteria?** — at least one measurable done condition?
- [ ] **Has depends_on?** — explicitly listed or explicitly empty `[]`?
- [ ] **Sized right?** — effort XS/S/M? (L tasks must be split or flagged)
- [ ] **No circular dependencies?** — depends_on references only lower-layer or earlier same-layer tasks?

If a task fails validation → rewrite it before proceeding. Mark rewrites with `<!-- rewritten: reason -->`.

---

## Step 5 — Output Format

### 1. Summary Table (sorted by priority_score desc within each layer)

| # | Layer | Task | Score | Effort | Depends on |
|---|-------|------|-------|--------|------------|
| 1 | Foundation | Init project & env config | 3.0 | S | — |
| 2 | Data Layer | Create User schema & migration | 4.5 | S | 1 |
| … | … | … | … | … | … |

### 2. Priority Ranking (top 10 by score across all layers, respecting depends_on)

List the 10 highest-priority tasks that have all dependencies satisfied — these are the first tasks to execute.

### 3. Detailed Task Cards

Full cards for every task using the format from Step 3.

### 4. 00-guide.md Template

Generate a ready-to-use `00-guide.md` for the tasks folder:

```markdown
# Execution Guide — [Project Name]
Generated: [DATE]

## Project Context
[1-paragraph summary of what is being built]

## Tech Stack
- Language: [язык]
- Framework: [фреймворк]
- DB: [база данных + ORM]
- Auth: [strategy]
- Testing: [tool]
- Observability: [logging lib, metrics tool]

## Execution Style
execution_style: careful  # careful | aggressive
# careful = small steps, verify each output before proceeding
# aggressive = full speed, trust the plan

## Code Conventions
- [naming conventions]
- [file structure conventions]
- [import/export style]

## Output Format Rules (for LLM)
- Always return complete files, never diffs or partial code
- Always include all imports
- No TODO comments, no placeholders
- Follow the exact Output and Done-when from each task card

## Error Handling Convention
[how errors should be returned: exception, result type, error codes, etc.]

## Environment Variables
[list required .env vars]
```

### 5. LLM Execution Guide

How to feed these tasks to an LLM in sequence:
- System prompt to set context once
- Order of prompts (follow priority ranking, not layer order)
- What to pass as context between steps

---

## Step 6 — Write Task Files

Save tasks to `tasks/{DATE}/` using the Kanban structure:

```
tasks/{DATE}/
├── 00-guide.md           ← generated in Step 5
├── _progress.json        ← created by Task Executor on first run
├── backlog/              ← all tasks start here
│   ├── L0/
│   │   ├── 01-init-project.md
│   │   └── 02-env-config.md
│   ├── L1/
│   └── ...
├── ready/                ← tasks whose depends_on are all done
├── in_progress/          ← currently being worked on
├── done/                 ← completed tasks
└── blocked/              ← tasks stuck on external blockers
```

All tasks begin in `backlog/`. Task Executor promotes them through the Kanban.

---

## Step 7 — Quality Checks

Before finalising, verify:

- [ ] No task requires knowledge from a future (not-yet-done) step
- [ ] Every entity in the design document has at least one task
- [ ] Every user-facing feature has at least one corresponding test task in L7
- [ ] Auth/security is Layer 4, not afterthought
- [ ] Layer 9 (Observability) tasks exist if this is a production project
- [ ] Each task has a measurable done condition and acceptance criteria
- [ ] Total plan can be executed top-to-bottom without circular dependencies
- [ ] priority_score is computed for every task
- [ ] All tasks passed Task Validation (Step 4)

---

## Special Handling

### For API Design Documents specifically

Parse OpenAPI/REST structure:
- Group endpoints by resource (one task group per resource)
- Order: schema → service → route → validation → test → observability
- Flag any endpoint that requires a non-trivial business rule as `COMPLEX`

### For Mobile / Frontend App Designs

Parse by screen/component:
- One task per screen or major component
- Separate: state management setup, navigation, API integration, UI polish

### For Microservice Architectures

Parse by service:
- One layer map per service
- Add inter-service contract tasks (define interfaces first)
- Flag shared libraries as `SHARED` — implement before consumers

---

## Reference

See `references/task-sizing-guide.md` for effort estimation examples.
See `references/llm-prompt-patterns.md` for LLM Prompt Hint templates.
