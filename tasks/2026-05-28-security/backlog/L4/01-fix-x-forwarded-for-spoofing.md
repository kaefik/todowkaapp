### L4-01 — Устранить X-Forwarded-For спуфинг + дублирование get_client_ip (H-01)

**Goal:** Единая функция get_client_ip с поддержкой доверенных прокси, убрать дубликат из auth.py.
**Input:** `backend/app/rate_limit.py:8`, `backend/app/api/auth.py:38`.
**Output:** Единая функция в `rate_limit.py`, auth.py использует её.
**Done when:** IP определяется корректно с учётом доверенных прокси.
**Acceptance criteria:**
- [ ] `get_client_ip` в `rate_limit.py` использует последний IP из X-Forwarded-For
- [ ] `TRUSTED_PROXIES` из settings фильтрует доверенные прокси
- [ ] Дубликат `get_client_ip` и отдельный `Limiter` удалены из `auth.py`
- [ ] `auth.py` использует `limiter` из `rate_limit.py`
- [ ] Существующие rate limits работают как прежде
**depends_on:** [L0/02]
**impact:** 5
**complexity:** 2
**risk:** 3
**priority_score:** 6.5
**Est. effort:** S
