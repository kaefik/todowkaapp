### L3-01 — Добавить расширенное логирование в get_current_user зависимость

**Goal:** Добавить детальное логирование в backend для диагностики 401 ошибок авторизации.
**Input:** Файл `backend/app/dependencies.py`
**Output:** Обновленный `backend/app/dependencies.py` с расширенным логированием в функции `get_current_user`
**Done when:** При каждом запросе к защищенным endpoint'ам логируется информация о токене, типе авторизации и результате.
**Acceptance criteria:**
- [ ] В начале `get_current_user` логируется тип авторизации (cookie или header)
- [ ] Логируются первые 10 символов полученного токена с суффиксом "...rest"
- [ ] При успешной валидации токена логируется User ID
- [ ] При ошибке авторизации (HTTPException) логируется причина с деталями
- [ ] Все логи используют logger из logging модуля
**depends_on:** []
**impact:** 3 (помогает диагностировать проблемы авторизации)
**complexity:** 1 (тривиально)
**risk:** 1 (безопасно, только логирование)
**priority_score:** (3 × 2 + 1) / 1 = 7.0
**Est. effort:** XS (30 min)
**LLM Prompt Hint:** В backend/app/dependencies.py найдите функцию get_current_user. Добавьте логирование:
1. В начале функции: logger.info(f"Auth attempt via {auth_type}")
2. После извлечения токена: logger.debug(f"Token: {token[:10]}...rest")
3. После успешной валидации: logger.info(f"User authenticated: {user.id}")
4. В блоке except HTTPException: logger.error(f"Auth failed: {exc.detail}")
Используйте logging.getLogger(__name__) для logger.
