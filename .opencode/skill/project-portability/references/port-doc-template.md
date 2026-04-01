# PORT-DOC Template

This is the full template for the platform-neutral specification document.
Fill every section. Remove placeholder text. Use plain language — no platform-specific implementation details.

---

```markdown
# PORT-DOC: [Project Name]

> **Version**: 1.0  
> **Source project**: [original stack, e.g. "React + Node.js + PostgreSQL CLI tool"]  
> **Generated**: [date]  
> **Purpose**: Platform-neutral specification for rebuilding this project on any target platform.

---

## 1. Project Overview

### What This Project Does
[2-4 sentences. What problem does it solve? Who uses it? What is the main value?]

### Core User Personas
- **[Persona 1]**: [Who they are, what they need]
- **[Persona 2]**: ...

### Key Constraints & Non-Negotiables
[Things that must remain true in any version — e.g., "must work offline", "responses under 200ms", "data never leaves the device"]

---

## 2. Feature Inventory

For each feature, describe it in platform-neutral terms.

### Feature: [Feature Name]
- **ID**: F-001
- **Summary**: [What it does in one sentence]
- **User story**: As a [user], I want to [action] so that [outcome]
- **Inputs**: [What data/actions trigger this feature]
- **Outputs / Effects**: [What the user sees or what changes in state]
- **Business rules**: 
  - [Rule 1]
  - [Rule 2]
- **Error cases**: [What can go wrong and how it should be handled]
- **External dependency**: [None / API name / DB / File system]

### Feature: [Feature Name]
- **ID**: F-002
[...repeat for all features...]

---

## 3. Data Models

### Entity: [EntityName]

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| id | uuid/int | yes | Unique identifier | auto-generated |
| [field] | [type] | [yes/no] | [description] | [max length, enum values, etc.] |

**Relationships**:
- Has many: [OtherEntity]
- Belongs to: [OtherEntity]

**Business rules on this entity**:
- [e.g., "email must be unique per account"]
- [e.g., "status can only transition: draft → active → archived"]

[...repeat for all entities...]

---

## 4. Core Business Logic

Describe algorithms and rules in plain language. No code required — just precise descriptions.

### Logic: [Logic Name]
- **Purpose**: [What problem this solves]
- **Trigger**: [When this runs — e.g., "when user submits form", "every 5 minutes", "on app start"]
- **Algorithm**:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3, with branches if needed: "if X, then Y; otherwise Z"]
- **Edge cases**:
  - [Edge case 1 and how to handle it]
  - [Edge case 2]
- **Performance notes**: [Any timing requirements or scale considerations]

[...repeat for all significant logic blocks...]

---

## 5. User Flows

### Flow: [Flow Name] (e.g., "New User Onboarding")

```
[Entry point] → [Step 1] → [Step 2] → [Decision point]
                                              ├── [Path A] → [Outcome A]
                                              └── [Path B] → [Outcome B]
```

**Steps**:
1. **[Step name]**: [What the user sees/does, what the system does]
2. **[Step name]**: [...]
   - If [condition]: [what happens]
   - If [condition]: [what happens]

**Success outcome**: [What the user has achieved]
**Failure outcomes**: [What errors/dead ends exist and what the recovery path is]

[...repeat for all main flows...]

---

## 6. State Management

### Application State
Describe all state the application maintains during a session:

| State key | Type | Initial value | When it changes | Who reads it |
|-----------|------|--------------|-----------------|--------------|
| [key] | [type] | [value] | [trigger] | [features] |

### Persisted State
What must be saved between sessions:

| Data | Storage type in original | Notes for porting |
|------|--------------------------|-------------------|
| [data] | [localStorage / DB / file / cookie] | [e.g., "can use any key-value store"] |

---

## 7. External Integrations

### Integration: [Service/API Name]
- **Purpose**: [What we use this for]
- **Calls made**: 
  - `[METHOD /endpoint]` — [what it does, what params, what response we use]
- **Auth**: [API key / OAuth / none]
- **Failure behavior**: [What should happen if this service is down]
- **Portability note**: [Can this be swapped? e.g., "Any email SMTP provider works here"]

---

## 8. Platform-Specific Notes from Original

### What was tightly coupled to the original platform
[List things that will need rethinking for other platforms]

Examples:
- "File drag-and-drop used HTML5 File API — needs platform-specific alternative on mobile"
- "Real-time updates used WebSockets — need to evaluate support on target platform"
- "Crypto operations used Node.js `crypto` — need platform equivalent"

### Suggested neutral alternatives
| Original implementation | Platform-neutral approach |
|------------------------|--------------------------|
| [tech] | [description of what it does abstractly] |

---

## 9. Glossary

| Term | Definition |
|------|------------|
| [Term] | [What it means in the context of this project] |

---

## 10. Open Questions

Things that need clarification before porting:

- [ ] [Question 1 — e.g., "Should the mobile version work offline?"]
- [ ] [Question 2]
```
