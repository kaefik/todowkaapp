### L4-01 — Реализовать условный secure для access_token cookie

**Goal:** Изменить логику установки cookie access_token чтобы использовать параметр secure из конфигурации.
**Input:** Файлы `backend/app/security.py` и `backend/app/config.py`
**Output:** Обновленные файлы с условным secure флагом для cookie
**Done when:** В dev режиме cookie устанавливается с secure=False, в production с secure=True.
**Acceptance criteria:**
- [ ] В `security.py` функция создания cookie использует `settings.cookie_secure` вместо hardcoded True
- [ ] Cookie `access_token` устанавливается с правильным флагом secure в зависимости от окружения
- [ ] В dev режиме (APP_ENV=development) secure=False
- [ ] В production режиме (APP_ENV=production) secure=True
- [ ] Можно переопределить через переменную окружения COOKIE_SECURE
**depends_on:** [L0/01]
**impact:** 5 (исправляет критическую ошибку авторизации SSE)
**complexity:** 2 (простая логика)
**risk:** 2 (безопасно, использует конфигурацию)
**priority_score:** (5 × 2 + 2) / 2 = 6.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** В backend/app/security.py найдите создание response с cookie access_token. Измените параметр secure на settings.cookie_secure. Убедитесь, что Settings импортирован из config. Проверьте, что cookie path='/api/sse', httponly=True, samesite='lax' остаются без изменений.
