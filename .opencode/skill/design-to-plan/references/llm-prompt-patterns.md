# LLM Prompt Patterns for Implementation Tasks

## System Prompt Template (set once per project)

```
You are an expert [language/framework] developer implementing [Project Name].
Tech stack: [list stack].
Conventions: [naming, folder structure, error handling style].
Always return complete, runnable code. No placeholders. No "TODO" comments.
```

---

## Pattern: Schema / Model Creation

```
Create a [ORM/framework] model for `[EntityName]` with these fields:
- [field]: [type], [constraints]
- [field]: [type], [constraints]

Include: timestamps, soft-delete if applicable.
Output: the model file + migration file.
```

---

## Pattern: CRUD Endpoint

```
Implement [METHOD] [/path] endpoint.
- Request body/params: [schema]
- Business logic: [describe logic]
- Response: [shape + status codes]
- Error cases: [list errors and their status codes]

Use existing [ServiceName] and follow the project's error handler pattern.
```

---

## Pattern: Business Logic / Service

```
Implement [ServiceName].[methodName]([params]).
- Input: [describe input]
- Expected output: [describe output]
- Rules:
  1. [rule]
  2. [rule]
- Dependencies: [list injected dependencies]

Return [type]. Throw [ErrorType] when [condition].
```

---

## Pattern: Validation

```
Create input validation for [EndpointName] using [library: zod/joi/class-validator].
Fields:
- [field]: [type], required/optional, [constraints]

Export as [SchemaName]. Use it in the route handler before calling the service.
```

---

## Pattern: Unit Test

```
Write unit tests for [ServiceName].[methodName] using [Jest/Vitest/pytest].
Cover:
1. Happy path: [describe]
2. Edge case: [describe]
3. Error case: [describe]

Mock: [list dependencies to mock].
```

---

## Chaining Context Between Steps

When passing context from step N to step N+1:

```
Previously completed:
[paste the output of the previous step here]

Now do the next step:
[prompt for next step]
```

Keep the context window lean — only pass the **output artifact** of the previous step, not the entire conversation.
