---
name: project-portability
description: "Analyze any software project and generate a comprehensive cross-platform portability document (PORT-DOC) that enables efficient recreation of the project for terminal/CLI, web, mobile, desktop, API, or any other target platform. Use this skill whenever the user wants to port or rewrite a project to another platform, needs to document a project's core logic for platform-independent understanding, asks to analyze a project for web/mobile/terminal version, wants to break down a project into platform-specific tasks, says things like 'document this so I can recreate it', 'I want a terminal version of this', 'help me port this to mobile', 'create tasks for rebuilding this on X'. Trigger even if the user just says 'analyze my project' or 'write docs for porting' — this skill handles the full workflow from analysis to actionable task breakdown."
---

# Project Portability Skill

Analyze a project and produce a **PORT-DOC** — a platform-neutral specification document that fully describes the project's core logic, data flows, and feature set so any target platform version can be built from it efficiently.

---

## Workflow Overview

```
1. SCAN      → Understand project structure & tech stack
2. ANALYZE   → Extract core logic, features, data models
3. WRITE     → Produce PORT-DOC (platform-neutral spec)
4. BREAKDOWN → Generate platform-specific task list
```

---

## Step 1 — SCAN: Understand the Project

Use `bash_tool` to explore the project. Run these commands (adapt paths as needed):

```bash
# Directory tree (top 3 levels)
find . -maxdepth 3 -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -not -path '*/__pycache__/*' -not -path '*/venv/*' -not -path '*/dist/*' \
  -not -path '*/.next/*' | sort

# Detect language/framework
cat package.json 2>/dev/null || cat requirements.txt 2>/dev/null || \
  cat Cargo.toml 2>/dev/null || cat go.mod 2>/dev/null || \
  cat pubspec.yaml 2>/dev/null || cat pom.xml 2>/dev/null || echo "No manifest found"

# Count files by extension
find . -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20

# Find entry points
find . -name "main.*" -o -name "index.*" -o -name "app.*" -o -name "server.*" \
  | grep -v node_modules | grep -v ".git" | head -20
```

Then read the most important files:
- Entry points (main, index, app)
- Core business logic files
- Data models / schema files
- Config files
- README if present

**Goal**: Understand what the project does, its stack, and its core concepts.

---

## Step 2 — ANALYZE: Extract Core Abstractions

After scanning, identify and document these aspects mentally before writing:

### Feature Inventory
List every user-facing feature. For each:
- What does it do (1 sentence)?
- What input does it take?
- What output/effect does it produce?
- Any external dependencies (API, DB, file system)?

### Data Models
- What entities exist? (User, Product, Task, etc.)
- What are their fields and types?
- How do they relate to each other?

### Core Business Logic
- What algorithms or rules are central?
- What calculations or transformations happen?
- What state needs to be maintained?

### I/O & External Dependencies
- Databases / storage
- External APIs
- File system operations
- Network operations
- Auth/session management

### User Flows
- What are the main user journeys?
- What sequences of actions lead to what outcomes?

---

## Step 3 — WRITE: Produce the PORT-DOC

Write a Markdown document with this exact structure. Save to `PORT-DOC.md` in project root (or to `/mnt/user-data/outputs/PORT-DOC.md`).

Read the template reference before writing:
→ **See `references/port-doc-template.md`** for the full PORT-DOC template with section-by-section guidance.

---

## Step 4 — BREAKDOWN: Platform-Specific Tasks

If the user specified a target platform (or multiple), generate a task breakdown after the PORT-DOC.

Read the platform guide for the target:
→ **See `references/platforms.md`** for platform-specific task patterns (CLI, Web, Mobile, Desktop, API)

### Task Format

Each task should follow this structure:

```
## [EPIC NAME]

### Task: [Task Title]
**Priority**: P0 / P1 / P2
**Effort**: XS / S / M / L / XL
**Depends on**: [Task IDs if any]
**Description**: What needs to be built/implemented
**Acceptance criteria**:
- [ ] Criterion 1
- [ ] Criterion 2
**Platform notes**: Any platform-specific considerations
```

### Task Grouping by Epic

Group tasks into epics:
1. **Foundation** — project setup, dependencies, tooling
2. **Data Layer** — models, storage, state management
3. **Core Logic** — business rules, algorithms (ported from PORT-DOC)
4. **UI/Interface** — platform-specific interface layer
5. **Integration** — external APIs, services
6. **Auth & Security** — authentication, permissions
7. **Polish** — error handling, edge cases, UX improvements

---

## Output Files

Always produce two outputs:

1. **`PORT-DOC.md`** — The platform-neutral specification
2. **`TASKS-[PLATFORM].md`** — Task breakdown for the target platform (if requested)

Use `present_files` to share both with the user.

---

## Communicating with the User

**Before starting**: If the user hasn't specified a target platform, ask:
- What platform are they targeting? (CLI/terminal, web, mobile, desktop, API-only, all)
- Any tech stack preferences for the target platform?
- Do they want just the PORT-DOC, or also a task breakdown?

**While working**: Narrate what you're doing in brief updates. Users appreciate knowing you're scanning files, not just silently processing.

**After delivering**: Summarize the project in 2-3 sentences and highlight the most complex parts to port.

---

## Quality Checklist

Before delivering, verify the PORT-DOC:
- [ ] Every feature from the original project is documented
- [ ] Data models are complete with all fields
- [ ] Business logic rules are described in plain language (no platform-specific code)
- [ ] External dependencies are flagged with alternatives suggested
- [ ] User flows cover all main paths
- [ ] A developer unfamiliar with the original project could build a new version from this doc alone
