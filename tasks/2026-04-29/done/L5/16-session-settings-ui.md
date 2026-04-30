### L5-16 — Frontend: session UI в Settings Security tab

**Goal:** Интегрировать компоненты управления сессиями в tab Security страницы Settings.

**Input:** SessionList + RevokeAllButton (L5-15). `frontend/src/routes/Settings.tsx`.

**Output:** Обновлённый Settings.tsx с секцией «Активные сессии» в Security tab.

**Done when:** В Settings → Security виден список сессий с возможностью отзыва.

**Acceptance criteria:**
- [ ] Секция «Активные сессии» добавлена в Security tab (после смены пароля, перед удалением аккаунта)
- [ ] Заголовок секции + описание «Устройства, на которых вы вошли»
- [ ] Рендерит `<SessionList />`
- [ ] Рендерит `<RevokeAllButton />` внизу секции
- [ ] Toast уведомление при успешном отзыве сессии
- [ ] Toast уведомление при ошибке
- [ ] Стили консистентны с остальным Settings

**depends_on:** [L5-15]

**impact:** 4 | **complexity:** 2 | **risk:** 1
**priority_score:** 7.0
**Est. effort:** M (~2h)
