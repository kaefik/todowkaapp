### L5/06 — Исправить onclick race condition в browserNotifications (BUG-10)

**Goal:** Перенести назначение `notification.onclick` до `await new Promise()`, чтобы обработчик клика был установлен до того, как пользователь успеет кликнуть.

**Input:**
- Текущий код: `frontend/src/utils/browserNotifications.ts:65-83`
- Проблема: `onclick` назначается на строке 77, после `await` на строке 65

**Output:**
- Обновлённый `frontend/src/utils/browserNotifications.ts` — функция `show()`

**Done when:**
1. `notification.onclick` назначен ДО `await new Promise()`

**Acceptance criteria:**
- [ ] Строка `notification.onclick = ...` находится ДО `await new Promise<boolean>(...)`
- [ ] Логика onclick: `window.focus(); notification.close(); options.onClick!()` — без изменений

**depends_on:** []
**impact:** 2
**complexity:** 1
**risk:** 1
**priority_score:** 5.0
**Est. effort:** XS

**LLM Prompt Hint:** "В функции show() в frontend/src/utils/browserNotifications.ts, перенеси назначение notification.onclick ДО await new Promise(). Это исправит race condition когда пользователь кликает до установки обработчика."
