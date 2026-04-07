### L1-05 — Update User Model with Tasks Relationship

**Goal:** Add tasks relationship to User model (bidirectional relationship).
**Input:** L1-02 and L1-03 completed (both models exist).
**Output:** Updated User model with tasks relationship.
**Done when:** User model has tasks relationship and Task model has user relationship.
**Acceptance criteria:**
- [ ] User model imports Task model
- [ ] User model has `tasks = relationship("Task", back_populates="user")`
- [ ] Task model has `user = relationship("User", back_populates="tasks")`
- [ ] Both relationships work correctly when querying
**depends_on:** [L1/02, L1/03]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** (3 × 2 + 1) / 1 = 7.0
**Est. effort:** XS (30min)
**LLM Prompt Hint:** Update the User model to add a relationship to Task. Ensure Task model has the corresponding back_populates relationship. This creates a bidirectional relationship between users and their tasks.
