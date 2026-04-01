---
name: qa-checklist
description: >
  Generate a comprehensive QA verification checklist after implementation is complete.
  Use this skill when the user wants to verify all features are implemented,
  says "создай чеклист проверки", "сгенерируй QA чеклист", "проверь реализацию",
  "create verification checklist", "what should I test", "did we implement everything",
  "generate test plan", "покажи что нужно протестировать".
  Takes the original design document and implementation plan as input.
  Produces a dual checklist: manual testing + automated test specifications.
  Run after Task Executor completes all tasks.
---

# QA Checklist Generator

Produce a complete verification checklist after implementation.
Every feature from the design must appear in the checklist — no exceptions.

---

## When to Run

```
Task Executor — all tasks DONE
         ↓
► QA Checklist Skill ◄
         ↓
docs/CHECKLIST-{DATE}.md
  ├── Coverage gap report
  ├── Manual testing steps
  ├── Automated test specifications
  └── Non-functional checklist
```

---

## Step 0 — Load Sources

1. `plan/*-design.md` — source of truth for features
2. `tasks/{DATE}/done/` — all completed tasks
3. `tasks/{DATE}/_progress.json` — metrics snapshot

State what was loaded and the current metrics before proceeding.

---

## Step 1 — Feature Inventory

Extract every feature from the design. Assign risk:
- 🔴 **HIGH** — core feature, data integrity, auth, payments
- 🟡 **MEDIUM** — important but not critical path
- 🟢 **LOW** — UI polish, nice-to-have

---

## Step 2 — Coverage Gap Report

Cross-reference feature inventory against `done/` tasks.

```
✅ AUTH-01 → covered by L4/01-auth-setup.md (DONE)
⚠️  AUTH-03 → no task found — COVERAGE GAP
```

Flag every gap. Ask user to confirm before generating the full checklist.

---

## Step 3 — Manual Testing Checklist

For each feature:

```markdown
### [FEATURE-ID] [Feature Name]
**Risk:** 🔴 / 🟡 / 🟢
**Preconditions:** [what must be true]

#### Happy Path
- [ ] [exact action] → Expected: [exact result]

#### Edge Cases
- [ ] [edge case] → Expected: [result]

#### Error Cases
- [ ] [invalid input] → Expected: [error message/code]
- [ ] Unauthenticated access → Expected: 401
- [ ] Wrong role → Expected: 403
```

Rules:
- Steps must be executable by a non-developer tester
- Every step has an observable expected result
- At least one error/invalid case per feature

---

## Step 4 — Automated Test Specifications

Specs only — not full code. Developer writes the implementation.

```markdown
### [FEATURE-ID] Automated Tests

#### Unit Tests
describe('[service]', () => {
  it('[behaviour]', () => { /* Arrange / Act / Assert */ });
  it('throws [error] when [condition]', () => { });
});

#### Integration Tests
describe('POST /[endpoint]', () => {
  it('returns 201 with [data] when [valid]');
  it('returns 422 when [invalid input]');
  it('returns 401 when unauthenticated');
});

#### E2E Tests (critical paths only)
test('[user journey]', async ({ page }) => {
  // Playwright/Cypress steps
});
```

Coverage targets:
- Unit: all service methods, all utility functions
- Integration: all API endpoints (happy + error)
- E2E: all critical user journeys

---

## Step 5 — Non-Functional Checklist

Always include, regardless of project type:

### Performance
- [ ] Core endpoints respond < [target]ms under normal load
- [ ] Same under 10x expected load
- [ ] No N+1 queries in query logs
- [ ] Assets optimised

### Security
- [ ] All authenticated endpoints return 401 when token missing
- [ ] Role-restricted endpoints return 403 for wrong role
- [ ] User A cannot access User B's data
- [ ] SQL injection attempt returns error, not data
- [ ] XSS attempt escaped in all input/output fields
- [ ] Sensitive data not logged or returned in responses
- [ ] HTTPS enforced in production

### Observability (Layer 9)
- [ ] All requests produce structured log entries
- [ ] Error events include correlation ID
- [ ] Key business events tracked as metrics
- [ ] Distributed traces available for critical flows
- [ ] Alerts configured for error rate and latency thresholds

### Error Handling
- [ ] 500 errors return generic message (no stack traces in production)
- [ ] Validation errors return field-level messages
- [ ] All errors logged with correlation ID
- [ ] External service failure handled gracefully

### Data Integrity
- [ ] Required DB constraints exist (NOT NULL, UNIQUE, FK)
- [ ] Transactions used for multi-step writes
- [ ] Data consistent after partial failures

---

## Step 6 — Output

Save to: `docs/CHECKLIST-{DATE}.md`

Structure:
```markdown
# QA Checklist — {project}
Date: {DATE} | Design: plan/{DATE}-design.md
Coverage gaps: [n] | Metrics: [X/Y tasks done, Z% with tests]

## Coverage Summary
| Feature | Risk | Manual | Auto | Gap? |

## Manual Testing
### Pre-conditions
- App running on staging
- Test DB seeded
- Test accounts: [credentials]

{per-feature sections}

## Automated Test Specifications
{per-feature specs}

## Non-Functional Checklist
{standard section}

## Sign-off
- [ ] All manual tests passed
- [ ] Automated suite passing (0 failures)
- [ ] Coverage gaps reviewed
- [ ] Performance targets met
- [ ] Security checklist done
- [ ] Observability verified
Approved by: ___  Date: ___
```

---

## After Delivery

Ask:
1. "Есть ли Coverage Gaps для закрытия до релиза?"
2. "Нужен ли полный код автотестов для конкретного раздела?"
3. "Нужен отдельный чеклист для production деплоя?"
