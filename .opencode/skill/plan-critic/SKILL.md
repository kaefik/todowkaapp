---
name: plan-critic
description: >
  Critically analyze any design document, plan, or specification before implementation begins.
  Use this skill when the user wants a critical review of a plan, design, or spec document,
  asks to "find holes in this plan", "challenge my assumptions", "what am I missing",
  "critique this design", "провести критический разбор", "найти слабые места",
  "что я упустил", "проверить план", "оценить дизайн".
  Run this skill 1–2 times after Brainstorming and before Design-to-Plan to catch
  fundamental flaws early, when they are cheap to fix.
  Outputs a structured critique document and a verdict: APPROVED / CONDITIONAL / NEEDS REVISION.
---

# Plan Critic

Critically analyze a design document to find flaws, gaps, and risks **before** implementation begins.
One hour of critique saves ten hours of refactoring.

---

## When to Run

```
Brainstorming Skill
       ↓
  plan/{DATE}-{slug}-design.md created
       ↓
► Plan Critic (run 1–2 times) ◄
       ↓
  plan/{DATE}-{slug}-critique.md + approved plan
       ↓
Design-to-Plan Skill
```

Run **at least once**. Run a second time if the first critique surfaced major changes.

---

## Step 0 — Load the Plan

Read the target plan document. If not specified, look for the most recent `plan/*-design.md`.

State what document you are critiquing before proceeding.

---

## Step 1 — Five Lenses of Critique

Analyze through exactly these five lenses. For each finding:
- 🔴 **BLOCKER** — must be resolved before implementation
- 🟡 **WARNING** — risky to ignore, should be resolved
- 🟢 **SUGGESTION** — optional improvement

### Lens 1: Completeness
- [ ] All user-facing features described?
- [ ] Data models fully defined (fields, types, relations)?
- [ ] Auth/security strategy explicitly stated?
- [ ] Error handling approach mentioned?
- [ ] External dependencies named?
- [ ] Observability/logging strategy mentioned (for production)?
- [ ] What happens when things go wrong (failure states)?

### Lens 2: Consistency
- [ ] Same concept named differently in different sections?
- [ ] Feature A assumes Feature B exists, but B is not planned?
- [ ] Tech choices conflict?
- [ ] Scope vs. timeline mismatch?

### Lens 3: Assumptions & Risks
For each implicit assumption: **"What if this is wrong?"**

Common hidden assumptions:
- "Users will have stable internet" → offline?
- "The external API will be available" → fallback?
- "This will scale to X users" → proven?

### Lens 4: YAGNI & Scope Creep
For each feature ask:
- Is this needed for the MVP?
- Could this be Phase 2?
- Cost of adding vs. value delivered?

### Lens 5: Technical Feasibility
- [ ] Anything requiring technology that doesn't exist?
- [ ] Performance requirements conflicting with architecture?
- [ ] Security requirements conflicting with UX?

---

## Step 2 — Assumption Inversion

Take the 3 most critical assumptions and invert them:

```
Assumption: [what the plan assumes]
Inversion:  [what if the opposite is true?]
Impact:     [what breaks?]
Mitigation: [design change that protects against this]
```

---

## Step 3 — Missing Scenarios

List scenarios the plan does not address:
- What happens when the user does X unexpectedly?
- Server/DB is down?
- 10x expected load?
- Bad/malicious input?
- External service fails?

For each: **Scenario** | **Risk** 🔴🟡🟢 | **Suggested handling**

---

## Step 4 — Verdict & Output

### Summary Table

| # | Lens | Issue | Severity | Fix |
|---|------|-------|----------|-----|

### Verdict

```
VERDICT: ✅ APPROVED — proceed to Design-to-Plan
VERDICT: 🟡 CONDITIONAL — address blockers, then proceed
VERDICT: 🔴 NEEDS REVISION — return to Brainstorming
```

Save to: `plan/{DATE}-{slug}-critique.md`

Then ask: "Хочешь исправить план сейчас или продолжить с текущим?"

---

## Principles

- **Be specific.** "Auth is not specified" ✅. "Needs more detail" ❌.
- **Cite the plan.** Reference exact sections when calling out issues.
- **Propose, don't just criticise.** Every BLOCKER must have a suggested fix.
- **Respect scope.** Don't add features — only flag missing necessities.

---

## Internal Patterns

**Premortem:** "Imagine it's 6 months from now and the project failed. What went wrong?"

**Devil's Advocate:** "What would the strongest critic of this plan say?"

**Rubber Duck:** Does each feature description make complete sense to someone who knows nothing about this project?
