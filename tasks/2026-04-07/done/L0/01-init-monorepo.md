### L0-01 — Initialize Monorepo Structure

**Goal:** Create the root monorepo directory structure and configuration files.
**Input:** Empty project directory.
**Output:** Complete monorepo folder structure (frontend/, backend/, docker/, .github/, README.md) + .gitignore + .editorconfig.
**Done when:** All directories exist and contain appropriate configuration files.
**Acceptance criteria:**
- [ ] Directory structure matches the design (frontend/, backend/, docker/, .github/)
- [ ] .gitignore excludes Python (.pyc, __pycache__, venv), Node (node_modules), IDE files (.vscode, .idea), and .env files
- [ ] .editorconfig defines consistent code style (indent_style=space, indent_size=2 or 4, charset=utf-8)
- [ ] README.md exists with basic project title and placeholder sections
**depends_on:** []
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** (5 × 2 + 1) / 1 = 11.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create the directory structure and configuration files for a monorepo with Python backend and Node.js frontend. Use standard .gitignore patterns for both tech stacks.
