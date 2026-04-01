---
name: project-onboarding
description: >
  Reverse-engineer an existing codebase into workflow-compatible documents so
  the full skill pipeline (plan-critic → design-to-plan → task-executor) can be applied.
  Use when the user wants to apply the workflow to an already-existing project,
  says "внедри workflow в проект", "подключи workflow к существующему проекту",
  "onboard existing project", "retrofit this codebase", "document this project for planning",
  "хочу использовать workflow для текущего проекта", "analyse my existing code".
  Works in two modes:
    MODE A — Feature: onboard only enough to add a specific new feature
    MODE B — Full: reverse-engineer the whole project for holistic planning
  Output feeds directly into plan-critic, then design-to-plan.
---

# Project Onboarding

Analyse an existing codebase and produce workflow-compatible documents,
so any project — regardless of age or state — can enter the planning pipeline.

---

## The Core Problem

The standard workflow assumes you start from scratch.
Existing projects break this assumption in three ways:

1. **No design document** — code came first, spec (if any) is outdated
2. **Some layers are already done** — L0, L1 may be complete; starting there wastes time
3. **Unknown debt** — the codebase has accumulated decisions no one documented

**Solution:** Reverse-engineer the project into an `as-is` design document,
then feed it into the normal workflow at the right entry point.

---

## Step 0 — Choose Mode

Ask the user if not already clear:

```
Вы хотите:
A) Добавить конкретную новую фичу в существующий проект
B) Полностью документировать проект и получить план улучшений / рефакторинга

Для A нужен только контекст, достаточный для новой фичи.
Для B нужен полный анализ — займёт больше времени.
```

---

## MODE A — Feature Onboarding

**Goal:** Extract just enough context to design and implement one new feature.
**Time:** 10–20 minutes. **Entry point after:** brainstorming-skill for the feature.

### Step A1 — Scan relevant layers

```bash
# Project structure (top 3 levels, skip noise)
find . -maxdepth 3 \
  -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -not -path '*/__pycache__/*' -not -path '*/dist/*' \
  -not -path '*/.next/*' -not -path '*/build/*' \
  | sort

# Package manifest (detect stack)
cat package.json 2>/dev/null || cat requirements.txt 2>/dev/null || \
  cat Cargo.toml 2>/dev/null || cat go.mod 2>/dev/null || \
  cat pubspec.yaml 2>/dev/null || cat pom.xml 2>/dev/null

# Existing DB schema (most important for feature design)
find . -name "schema.*" -o -name "*.prisma" -o -name "models.py" \
  -o -name "*.sql" | grep -v node_modules | grep -v .git | head -10

# Auth pattern (critical for any feature)
find . -name "auth*" -o -name "middleware*" -o -name "guards*" \
  | grep -v node_modules | grep -v .git | head -10

# Entry point
find . -name "main.*" -o -name "index.*" -o -name "app.*" -o -name "server.*" \
  | grep -v node_modules | grep -v .git | head -5
```

Read the most important files:
- Package manifest (tech stack)
- Schema file (data models)
- Auth middleware (security pattern)
- Entry point (framework setup)
- README (if exists and is recent)

### Step A2 — Generate 00-guide.md

Fill in `tasks/{DATE}/00-guide.md` from what was found:

```markdown
# Execution Guide — {Project Name}
Generated: {DATE} (from existing project scan)

## Project Context
{1 paragraph: what the project does, from README or code inference}

## Tech Stack (detected)
- Language: {detected}
- Framework: {detected}
- DB: {detected + ORM}
- Auth: {detected strategy}
- Testing: {detected tool or "not found"}
- Package manager: {detected}

## Existing Conventions (extracted from code)
- Naming: {observed pattern}
- File structure: {observed pattern}
- Error handling: {observed format from existing handlers}
- Import style: {ESM/CJS, named/default}

## Execution Style
execution_style: careful

## Output Format Rules
[standard rules]

## Environment Variables (from .env.example or code)
[list]
```

### Step A3 — Ask about the new feature

Now trigger **brainstorming-skill** with the following context pre-loaded:
- Existing tech stack is fixed (no stack decisions needed)
- Existing entities are constraints (don't redesign what exists)
- L0 Foundation is already DONE (skip in design-to-plan)
- L1 Data Layer may be partially DONE (check what entities are needed)

Tell the user:
"Контекст проекта загружен. Какую фичу хочешь добавить?
Я запущу brainstorming-skill с учётом существующего стека и архитектуры."

---

## MODE B — Full Project Onboarding

**Goal:** Complete reverse-engineering into an `as-is` design document
plus a gap analysis (what's missing, what's broken).
**Time:** 30–60 minutes. **Entry point after:** plan-critic in audit mode.

### Step B1 — Deep Scan

```bash
# Full structure
find . -maxdepth 4 \
  -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -not -path '*/__pycache__/*' -not -path '*/dist/*' \
  -not -path '*/.next/*' -not -path '*/build/*' \
  -not -path '*/coverage/*' \
  | sort

# File count by extension (understand codebase composition)
find . -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20

# Test coverage (if available)
cat coverage/coverage-summary.json 2>/dev/null | head -20
npx vitest run --coverage 2>/dev/null | tail -20

# Git log (understand activity, recent changes)
git log --oneline -20 2>/dev/null

# Open issues or TODO count
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.js" \
  --include="*.py" -l 2>/dev/null | head -20

# Dependencies: check for outdated/vulnerable
npm outdated 2>/dev/null | head -20
```

Read systematically:
- All schema/model files
- All service/business logic files
- All route/controller files
- Auth setup
- Config files
- Test files (to understand what IS tested)
- CI/CD config

### Step B2 — Extract Core Abstractions

Build a mental model before writing anything:

**Entities:** What data models exist? Fields, types, relations.

**Features:** What does the system actually do? List every user-facing operation.

**Flows:** What are the main user journeys? (registration, login, main action, etc.)

**Integrations:** What external services are used? (email, payments, storage, etc.)

**What's tested:** Which features have tests? What coverage level?

**What's missing (gap analysis):**
- Auth exists? Is it complete?
- Validation exists? Is it consistent?
- Error handling centralised or scattered?
- Logging structured or ad-hoc?
- Observability exists at all?
- Tests cover critical paths?

### Step B3 — Write as-is Design Document

Save to: `plan/{DATE}-{slug}-as-is.md`

```markdown
# As-Is Design: {Project Name}
**Date:** {DATE}
**Source:** Reverse-engineered from codebase at {repo path}
**Mode:** Full project onboarding

---

## What This Project Does

{2–3 paragraphs: purpose, users, core value proposition — inferred from code}

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | {lang + version} |
| Framework | {framework + version} |
| Database | {db + ORM} |
| Auth | {strategy + library} |
| Testing | {tool + coverage %} |
| Logging | {tool or "none found"} |
| Deployment | {CI/CD or "unknown"} |

## Data Models (existing)

### {Entity 1}
| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| ... | ... | ... |

{Repeat for each entity}

## Features (existing)

| Feature | Endpoint / Entry | Status | Tested? |
|---------|-----------------|--------|---------|
| User registration | POST /auth/register | Complete | Yes |
| ... | ... | ... | ... |

## User Flows (existing)

### {Flow 1: e.g. Registration}
1. {step}
2. {step}

## Integrations (existing)

| Service | Purpose | Library | Status |
|---------|---------|---------|--------|
| {name} | {what for} | {lib} | Working / Partial |

---

## Gap Analysis

### Missing or Incomplete Features
- {feature} — {why it's missing / what's partial}

### Technical Debt
- {debt item} — {severity: high/medium/low} — {description}

### Layer Coverage
| Layer | Status | Notes |
|-------|--------|-------|
| L0 Foundation | Complete | Project exists, config set up |
| L1 Data Layer | Partial | Users table exists, Products missing |
| L2 Business Logic | Partial | UserService complete, no ProductService |
| L3 API | Partial | Auth routes done, product routes missing |
| L4 Auth | Complete | JWT implemented |
| L5 Integration | Missing | No email service |
| L6 Validation | Partial | Some endpoints validated, inconsistent |
| L7 Tests | Partial | 40% coverage, E2E missing |
| L8 Docs | Missing | No API docs, no README |
| L9 Observability | Missing | No structured logging, no metrics |

### Verdict for Workflow Entry
{One of:}
- "New features only" — foundation is solid, just add features via MODE A
- "Stabilise first" — address {list} before adding features
- "Significant refactor needed" — {layers} need rework before building on top
```

### Step B4 — Populate 00-guide.md

Same as Mode A Step A2 but more thorough — all fields must be filled.

Also add a `## Existing Layer Status` section:

```markdown
## Existing Layer Status
# Task Executor will use this to mark layers as pre-completed

L0_status: done          # Foundation is complete
L1_status: partial       # Some entities exist; see as-is doc for which
L2_status: partial
L3_status: partial
L4_status: done
L5_status: missing
L6_status: partial
L7_status: partial       # coverage: 40%
L8_status: missing
L9_status: missing
```

### Step B5 — Hand off to plan-critic (Audit Mode)

Run plan-critic on the `as-is` document, but with a modified lens:

Remind the user to say:
```
"Используй plan-critic для plan/{DATE}-{slug}-as-is.md
Это существующий проект, а не новый дизайн.
Сфокусируйся на: техническом долге, пробелах в архитектуре,
рисках добавления новых фич поверх текущего состояния."
```

plan-critic in this context produces:
- Technical debt severity ranking
- Risk assessment for adding features now vs stabilising first
- Specific gaps to close (missing layers, missing tests, missing observability)
- Recommended order: fix X before building Y

### Step B6 — Feed into design-to-plan (with pre-marked layers)

When running design-to-plan on the resulting plan, instruct it:
- Skip L0 entirely (already done)
- Mark pre-existing tasks as `status: done` in `_progress.json`
- Only generate tasks for gaps and new features

The design-to-plan skill will read `L{N}_status` from `00-guide.md`
and pre-populate `_progress.json` accordingly.

---

## Output Summary

### MODE A produces:
- `tasks/{DATE}/00-guide.md` — ready for task-executor
- Context pre-loaded for brainstorming-skill

### MODE B produces:
- `plan/{DATE}-{slug}-as-is.md` — full reverse-engineered design
- `tasks/{DATE}/00-guide.md` — with `L{N}_status` fields
- Gap analysis embedded in the as-is doc
- Clear recommendation: stabilise vs build

---

## Key Rules

1. **Do not redesign what exists.** Describe it as-is, even if it's imperfect.
2. **Be explicit about unknowns.** If a flow isn't clear from the code, say so — don't guess.
3. **Layer status is binary.** `done` = complete and working. `partial` = exists but incomplete. `missing` = not present.
4. **Gap analysis is not a critique.** It's a map. Severity helps prioritise, not shame.
5. **MODE A is the default** unless the user explicitly wants full project analysis.

---

## References

See `references/scan-commands.md` for platform-specific scan commands (Python, Go, Rust, Java).
See `references/layer-status-guide.md` for how to assess each layer's completeness.
