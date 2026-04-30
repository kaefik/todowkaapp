### L5-15 — Frontend: session API клиент + компоненты

**Goal:** Создать API клиент для sessions и базовые React компоненты.

**Input:** Session API endpoints (L3-08). authStore с sessionId (L5-14).

**Output:**
- `frontend/src/api/sessions.ts` — API клиент
- `frontend/src/components/sessions/SessionList.tsx`
- `frontend/src/components/sessions/SessionCard.tsx`
- `frontend/src/components/sessions/RevokeAllButton.tsx`

**Done when:** Компоненты рендерятся с моковыми/реальными данными.

**Acceptance criteria:**
- [ ] `sessions.ts`: `getSessions()`, `revokeSession(id)`, `revokeAllSessions()`. Типы `Session`, `SessionResponse`.
- [ ] `SessionCard.tsx`: пропс session data + isCurrent. Показывает: иконка устройства (desktop/mobile/tablet), browser, os, ip_address, created_at (относительная дата), last_activity. Кнопка «Отозвать» (скрыта если isCurrent). Бейдж «Текущая» если isCurrent.
- [ ] `SessionList.tsx`: загружает сессии через API, передаёт sessionId из authStore для определения текущей. Рендерит список SessionCard. Loading/empty states.
- [ ] `RevokeAllButton.tsx`: кнопка «Выйти со всех устройств» с confirm dialog. Вызывает `revokeAllSessions()`, затем обновляет список.
- [ ] i18n ключи добавлены для ru/en
- [ ] Tailwind стили, dark mode совместимость

**depends_on:** [L5-14]

**impact:** 4 | **complexity:** 3 | **risk:** 1
**priority_score:** 7.5
**Est. effort:** M (~2h)
