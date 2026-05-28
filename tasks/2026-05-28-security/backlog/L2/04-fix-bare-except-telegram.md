### L2-04 — Исправить bare except в telegram_auth_service (M-07)

**Goal:** Заменить `except: return None` и `except Exception as e: pass` на логирование.
**Input:** `backend/app/services/telegram_auth_service.py:48,65`.
**Output:** Все except-блоки логируют ошибки.
**Done when:** Нет bare except, все Exception-блоки логируют через logger.
**Acceptance criteria:**
- [ ] `except Exception as e: pass` → `except Exception as e: logger.error(..., exc_info=True)`
- [ ] `except: return None` → `except Exception: logger.error(...); return None`
- [ ] Добавлен `import logging` + `logger = logging.getLogger(__name__)`
**depends_on:** []
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS
