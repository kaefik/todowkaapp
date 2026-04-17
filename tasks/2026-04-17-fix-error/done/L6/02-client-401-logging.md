### L6-02 — Добавить расширенную диагностику 401 ошибок на клиенте

**Goal:** Добавить детальное логирование в frontend httpClient для диагностики причин 401 ошибок.
**Input:** Файл `frontend/src/api/httpClient.ts`
**Output:** Обновленный `frontend/src/api/httpClient.ts` с расширенным логированием
**Done when:** При каждом запросе логируется информация о токене, cookie и результате запроса.
**Acceptance criteria:**
- [ ] Перед запросом логируется первые 10 символов токена из localStorage с суффиксом "...rest"
- [ ] Логируется наличие cookie в document.cookie для access_token
- [ ] Логируется путь запроса и метод
- [ ] При ответе с 401 логируется детальная информация (статус, текст ошибки)
- [ ] Логи используют console.debug для отладочной информации
**depends_on:** []
**impact:** 3 (помогает диагностировать проблемы авторизации)
**complexity:** 1 (тривиально)
**risk:** 1 (безопасно, только логирование)
**priority_score:** (3 × 2 + 1) / 1 = 7.0
**Est. effort:** XS (30 min)
**LLM Prompt Hint:** В frontend/src/api/httpClient.ts найдите перехватчик запросов (request interceptor). Добавьте логирование:
1. Токен из localStorage: console.debug(`Token: ${token?.substring(0, 10)}...rest`)
2. Cookie: console.debug(`Cookie has access_token: ${document.cookie.includes('access_token')}`)
3. URL и метод: console.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`)
В перехватчике ответов логируйте 401 ошибки: console.error(`401 Error: ${response.status} ${response.config.url}`)
