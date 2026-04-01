# LLM Prompt Patterns by Task Type

Use these templates in PROMPT mode. Fill in `[bracketed]` placeholders.

---

## 🗄️ Schema / Migration

```
You are building [project] with [ORM, e.g. Prisma/TypeORM/SQLAlchemy].

Previous context:
[paste previous output]

Create a database migration and model for `[EntityName]` with these fields:
- id: UUID, primary key, auto-generated
- [field]: [type], [nullable/required], [unique?]
- [field]: [type], [nullable/required]
- createdAt: timestamp, auto
- updatedAt: timestamp, auto
[- deletedAt: timestamp, nullable]  ← include if soft-delete needed

Relationships:
- [EntityName] has many [OtherEntity] via [foreignKey]

Output:
1. Migration file: [filename]
2. Model/Entity class: [filename]

Done when: migration runs without errors, model exports correctly.
```

---

## ⚙️ Service / Business Logic

```
You are building [project] with [stack].

Previous context:
[paste previous output]

Implement `[ServiceName]` class with method `[methodName]([params])`.

Business rules:
1. [rule]
2. [rule]
3. [rule]

Inputs: [describe each param and its type]
Returns: [return type and shape]
Throws: [ErrorType] when [condition]

Dependencies to inject: [list repos/services]

Output: complete `[filename]` file.
Done when: method handles happy path and throws correctly on error cases.
```

---

## 🌐 REST Endpoint (single)

```
You are building [project] with [framework, e.g. Express/Fastify/NestJS].

Previous context:
[paste previous output — model + service]

Implement [METHOD] [/path] endpoint.

Request:
- Params: [if any]
- Body: { [field]: [type], ... }
- Headers: Authorization: Bearer <token>  [if auth required]

Business logic: call [ServiceName].[methodName] with the request data.

Responses:
- 200/201: { [response shape] }
- 400: { error: "validation message" }
- 404: { error: "not found" }
- 500: { error: "internal error" }

Output: route handler in `[filename]`.
Done when: endpoint returns correct status codes for each case.
```

---

## 🔐 Auth / Middleware

```
You are building [project] with [stack].

Previous context:
[paste previous output]

Implement [authMiddleware / jwtVerify / roleGuard] middleware.

Strategy: [JWT / Session / API Key]
Secret source: process.env.[ENV_VAR_NAME]
Token location: [Authorization header / cookie]

On success: attach decoded user to [req.user / ctx.user]
On failure: return 401 { error: "Unauthorized" }

[If role guard:]
Required role: [role name]
On unauthorized role: return 403 { error: "Forbidden" }

Output: `[filename]` middleware + unit test file.
Done when: valid token passes, expired/missing token returns 401.
```

---

## ✅ Validation / DTO

```
You are building [project] using [zod / joi / class-validator].

Previous context:
[paste previous output]

Create input validation schema for [EndpointName] ([METHOD] [/path]).

Fields:
- [field]: [type], required, [min/max/pattern/enum]
- [field]: [type], optional, default: [value]

On validation failure: return 400 with field-level error messages.

Output:
1. Schema/DTO: `[filename]`
2. Applied in route handler before calling service

Done when: invalid input returns 400 with clear error, valid input passes through.
```

---

## 🧪 Unit Test

```
You are writing tests for [project] using [Jest / Vitest / pytest / go test].

Previous context (the code under test):
[paste the service/function code]

Write unit tests for `[ServiceName].[methodName]`.

Test cases:
1. ✅ Happy path: [describe input → expected output]
2. ⚠️ Edge case: [describe]
3. ❌ Error case: [describe input → expected thrown error]

Mocks needed:
- [dependency]: mock [specific method] to return [value]

Output: `[filename].test.[ext]`
Done when: all 3 cases pass, coverage >80% for this function.
```

---

## 🔧 Config / Setup

```
You are setting up [project] with [stack].

Task: Configure [tool/library, e.g. database connection / env config / logger].

Requirements:
- Read config from environment variables: [list vars]
- Fail fast if required vars are missing (throw on startup)
- Export: [what to export, e.g. db client, config object]

Output: `[filename]` (e.g. src/config/database.ts)
Done when: app starts correctly with valid env, throws descriptive error with invalid env.
```

---

## Context Chaining Rule

Always start the next prompt with:

```
Previous step output (use as context, do not rewrite):
---
[paste the key output: file contents, schema, or function signature from last step]
---

Now implement the next step:
[task prompt]
```

This keeps the LLM grounded without re-explaining the whole project every time.
