### L0-03 — Frontend Project Scaffold

**Goal:** Initialize the frontend React + TypeScript + Vite project.
**Input:** L0-01 completed (monorepo structure exists).
**Output:** Complete Vite + React + TypeScript project with all dependencies and folder structure.
**Done when:** `npm run dev` starts the dev server successfully.
**Acceptance criteria:**
- [ ] Project created with `npm create vite@latest frontend -- --template react-ts`
- [ ] Dependencies installed: react-router, zustand, tailwindcss, react-hook-form, zod, vite-plugin-pwa
- [ ] Tailwind CSS configured (tailwind.config.js, postcss.config.js, CSS imports)
- [ ] Directory structure: src/{main.tsx, App.tsx, routes/, components/, hooks/, api/, stores/, types/, utils/}
- [ ] TypeScript tsconfig.json configured with strict mode
**depends_on:** [L0/01]
**impact:** 5
**complexity:** 2
**risk:** 1
**priority_score:** (5 × 2 + 1) / 2 = 5.5
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create a Vite + React + TypeScript project and install all required dependencies: react-router, zustand, tailwindcss with configuration, react-hook-form, zod, vite-plugin-pwa. Create the specified directory structure.
