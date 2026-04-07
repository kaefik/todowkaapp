### FE-UI-03 — Task Edit Modal

**Goal:** Create modal dialog for editing task details.
**Input:** L0-03, FE-Tasks-01 completed (project and hook exist).
**Output:** `frontend/src/components/TaskEditModal.tsx` component.
**Done when:** User can edit task title and description in a modal.
**Acceptance criteria:**
- [ ] Accepts props: task (Task), isOpen (boolean), onClose (function), onSave (function)
- [ ] Form with title and description fields (both editable)
- [ ] Uses react-hook-form for form management
- [ ] Pre-fills form with current task data
- [ ] Calls onSave with updated data on submit
- [ ] Closes modal on cancel or after save
- [ ] Styled with Tailwind CSS, responsive
- [ ] Accessible (focus management, ARIA attributes)
**depends_on:** [L0/03, FE-Tasks/01]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** (4 × 2 + 1) / 2 = 4.5
**Est. effort:** S (1h)
**LLM Prompt Hint:** Create TaskEditModal component. Props: task, isOpen, onClose, onSave. Form with title and description fields using react-hook-form. Pre-fill with task data. Call onSave on submit. Close on cancel or save. Tailwind CSS, responsive, accessible.
