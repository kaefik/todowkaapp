# Критика: Аудит безопасности фронтенда (v2)

**Дата:** 2026-05-31
**Критикуемый документ:** `docs/plans/2026-05-31-security-frontend.md`

---

## Lens 1: Completeness

### 🔴 BLOCKER: C1 и H1 — ложная критичность

План помечает как CRITICAL отсутствие заголовков в `nginx.conf`. Но в реальности:

1. **Docker-деплой** (`frontend/Dockerfile:11-15` + `nginx.conf:11-21`) — nginx проксирует `/api` → `http://backend:8000`. Это означает что **все** запросы к API проходят через nginx к бэкенду, и `SecurityHeadersMiddleware` (`backend/app/main.py:75-92`) **уже добавляет все заголовки** к ответам.
2. Бэкенд устанавливает: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (production), `Content-Security-Policy`.
3. **Для статических файлов** (`/usr/share/nginx/html`) — заголовков действительно нет, но статика (JS/CSS/HTML) не содержит пользовательских данных и не требует CSP для защиты от injection.

**Вывод:** C1 не CRITICAL. Понижен до **LOW** — добавить заголовки для статики в nginx.conf как defense-in-depth.

### 🔴 BLOCKER: H1 — HTTPS — не фронтендная проблема

План предлагает переписать `nginx.conf` для TLS. Но:

1. `frontend/Dockerfile` — это контейнер с nginx для статики. TLS-сертификаты не существуют внутри контейнера.
2. В реальном деплое TLS терминируется на уровне reverse-proxy (Traefik, Caddy, cloud LB) или orchestration-слоя (k8s Ingress).
3. Предложенный конфиг с `ssl_certificate /etc/nginx/ssl/cert.pem` **сломает деплой** — сертификатов нет, nginx не запустится.

**Вывод:** H1 не HIGH и не задача фронтенда. Перенести в **INFO** — документировать что TLS должен быть на уровне инфраструктуры.

### 🟡 WARNING: M1 — console.log — неполная оценка реального риска

План говорит "~60+ console.log/warn/error в production раскрывают данные". Но:

1. `console.log` в minified production-бандле **не раскрывают исходный код** — имена переменных минифицированы.
2. Раскрытие данных в DevTools требует что **пользователь сам откроет DevTools** на своём устройстве. Это не удалённая атака.
3. Реальный риск: developer tools в руках злоумышленника на чужом устройстве — но это уже физический доступ.
4. Тотальный ремонт 60+ вызовов — высокая стоимость при **низком** реальном риске.

**Предложение:** Понижать до LOW. Ограничиться удалением console-вызовов, которые логируют **чувствительные данные** (пароли, токены, полные payload), а не все подряд.

### 🟡 WARNING: M2 — IndexedDB шифрование — YAGNI

План предлагает "шифрование через Web Crypto API" и тут же пишет "можно отложить". Это противоречие:

1. Шифрование IndexedDB добавляет огромную сложность: ключёмнгт, производительность, потеря данных при потере ключа.
2. Ни одно популярное веб-приложение (Todoist, Notion, Trello) не шифрует IndexedDB.
3. Реальный вектор: физический доступ к устройству — но это защита ОС, не приложения.

**Предложение:** Удалить из плана полностью или вынести в отдельный far-future backlog.

### 🟡 WARNING: Пропущена проверка — SW fetch handler не проверяет origin

План из 2026-05-28 (пункт 4) описывает что `sw.ts:58-74` перехватывает ВСЕ navigate-запросы без проверки origin. В текущем плане 2026-05-31 это **не упомянуто** — ни в статусе предыдущих исправлений, ни в новых находках.

Фактический код (`sw.ts:59`):
```ts
const url = new URL(event.request.url)
```

Никакой проверки `url.origin !== self.location.origin`. Service Worker по спецификации получает события только для своего scope, но проверка — best practice.

**Предложение:** Добавить в P1.4 вместе с валидацией notification URL.

---

## Lens 2: Consistency

### 🟡 WARNING: Дублирование с планом 2026-05-28

План 2026-05-31 дублирует ~70% содержимого плана 2026-05-28 (SW, telegram_bot_token, IndexedDB, SyncProvider, sourcemaps, httpClient). При этом:

- Формулировки решений идентичны
- Статус "не исправлено" указан, но **не объяснено почему** — это блокирует? Нет ресурсов? Нет приоритета?
- Два плана по одной теме создают путаницу: какой из них актуальный?

**Предложение:** Либо объединить в один документ (заменив 2026-05-28), либо явно указать что 2026-05-31 **полностью заменяет** 2026-05-28.

### 🟢 SUGGESTION: Нумерация не совпадает

В секции "План исправлений" — нумерация 1.1–1.4, 2.1–2.5, 3.1–3.8. В секции "Находки" — C1, H1-H2, M1-M5, L1-L4. Нет маппинга между ними. Например:
- L1 (URL в SW) → входит в 1.4, но не очевидно
- M3 (SSE-валидация) → 2.2, но M5 (register credentials) → 2.5

---

## Lens 3: Assumptions & Risks

### Inversion 1

| | |
|---|---|
| **Assumption** | nginx.conf — единственная точка деплоя статики |
| **Inversion** | Приложение деплоится через Vercel/Netlify/cloud CDN без nginx |
| **Impact** | Все исправления nginx.conf бессмысленны |
| **Mitigation** | Уточнить у владельца реальную схему деплоя перед исправлением C1/H1 |

### Inversion 2

| | |
|---|---|
| **Assumption** | `credentials: 'include'` в register нужен (M5) |
| **Inversion** | Бэкенд НЕ устанавливает cookie при регистрации — только при login |
| **Impact** | Добавление `credentials: 'include'` не ломает, но не решает реальной проблемы. Фактически register → login — двухшаговый процесс |
| **Mitigation** | Проверить бэкенд: устанавливает ли `/api/auth/register` Set-Cookie. Если нет — M5 не нужна |

### Inversion 3

| | |
|---|---|
| **Assumption** | Telegram bot token маскируется бэкендом и безопасен |
| **Inversion** | Маскированное значение (*****12345) раскрывает 5 последних символов, а localStorage доступен при XSS |
| **Impact** | Текущий H2 обоснован, но риск ниже чем заявлен — полный токен никогда не попадает на клиент |
| **Mitigation** | Понижать H2 до MEDIUM. Основная мера — исключить из persist (уже предложено) |

---

## Lens 4: YAGNI & Scope Creep

### 🟡 WARNING: Объём P3 раздут

8 задач низкого приоритета. Из них:
- 3.1 (sourcemaps) — Vite по умолчанию не генерирует sourcemaps. Явный `false` — перестраховка.
- 3.3 (абсолютные URL) — явно указано что "не активная уязвимость"
- 3.5 (Onboarding) — компонент сам проверяет auth, просто нецентрализованно
- 3.6 (PWA манифесты) — вообще не security, это UI-проблема
- 3.8 (dev server headers) — dev-режим, не продакшн

**Предложение:** Оставить 3.2 (default-section), 3.4 (API_BASE_URL), 3.7 (exportImport). Остальное удалить или вынести в отдельный "tech-debt backlog".

### 🟢 SUGGESTION: M4 (error detail фильтрация) — overengineering

Предложенная проверка `!errorData.detail.includes('Traceback')` — хрупкая. Если бэкенд на Rust/Go — не будет Traceback. Решение должно быть на бэкенде (не отправлять внутренние ошибки), а не на фронтенде (фильтровать).

---

## Lens 5: Technical Feasibility

### 🟡 WARNING: Решение H1 (HTTPS в nginx.conf) сломает Docker

Предложенный конфиг:
```nginx
ssl_certificate /etc/nginx/ssl/cert.pem;
```

В `Dockerfile` нет `COPY` для сертификатов и нет `EXPOSE 443`. Если добавить HTTPS-блок — nginx не запустится без сертификатов. Нужен:
- Том с сертификатами (`-v /certs:/etc/nginx/ssl`)
- Или отдельный compose-сервис для TLS-терминации
- Или `docs/deployment.md`

### 🟢 SUGGESTION: Утилита для console.log

Предложенный вариант с `const debug = import.meta.env.DEV ? ... : () => {}` — хороший, но нужно решить:
- Где разместить файл утилиты? (`src/utils/debug.ts`?)
- Использовать `console.log` или `console.debug`?
- `tree-shaking` уберёт пустую функцию в production?

---

## Missing Scenarios

| Сценарий | Риск | Предложение |
|----------|------|-------------|
| Nginx `add_header` в location блоке **перезаписывает** заголовки из server блока | 🟡 В nginx `add_header` в location наследуется ТОЛЬКО если в location нет своего `add_header`. Если в `/api` location есть proxy-header — заголовки безопасности могут не применяться к API-ответам | Проверить: добавить `add_header` в каждый location или использовать `always` |
| `add_header` не работает для 4xx/5xx без `always` | 🟡 `add_header X-Frame-Options DENY` без `always` — не отправляется для 404, 500 и т.д. В плане `always` указан, но нужно убедиться | Уже есть в плане — OK |
| CSP блокирует inline-стили Tailwind | 🟡 CSP `style-src 'self'` заблокирует `<style>` теги и inline-styles. Tailwind 4 использует JIT, но PWA manifest и VitePWA могут инжектить inline-стили | Использовать `'unsafe-inline'` для style-src (уже есть в бэкенд-CSP: `style-src 'self' 'unsafe-inline'`) |
| Service Worker обновление — кэшированная уязвимая версия | 🟢 Пользователь с закэшированным SW не получит исправления безопасности | `registerType: 'prompt'` в VitePWA — пользователь видит уведомление об обновлении. Дополнительно можно добавить `skipWaiting` в SW |

---

## Сводная таблица

| # | Lens | Проблема | Серьёзность | Исправление |
|---|------|----------|-------------|-------------|
| 1 | Completeness | C1 (CSP в nginx) — ложная критичность, бэкенд уже ставит заголовки | 🔴 BLOCKER | Понизить до LOW, добавить только для статики |
| 2 | Completeness | H1 (HTTPS) — сломает Docker, не задача фронтенда | 🔴 BLOCKER | Понизить до INFO, вынести в deployment docs |
| 3 | Completeness | Пропущена проверка origin в SW fetch handler | 🟡 WARNING | Добавить в 1.4 |
| 4 | Completeness | M1 (console) — переоценён риск | 🟡 WARNING | Понизить до LOW, удалять только с чувствительными данными |
| 5 | Consistency | Дублирование с планом 2026-05-28 | 🟡 WARNING | Объединить или явно заменить |
| 6 | YAGNI | M2 (IndexedDB шифрование) | 🟡 WARNING | Удалить из плана |
| 7 | YAGNI | P3 раздут (8 задач, многие не security) | 🟡 WARNING | Сократить до 3 релевантных |
| 8 | Feasibility | HTTPS в nginx.conf сломает Docker без сертификатов | 🟡 WARNING | Перенести в docs/deployment.md |
| 9 | Assumptions | M5 (credentials: include) — возможно не нужно | 🟢 SUGGESTION | Проверить бэкенд перед исправлением |
| 10 | Assumptions | H2 — риск ниже заявленного (токен маскируется) | 🟢 SUGGESTION | Понизить до MEDIUM |
| 11 | Feasibility | M4 — фильтрация Traceback на фронтенде хрупкая | 🟢 SUGGESTION | Решать на бэкенде |

---

## Verdict

```
VERDICT: 🟡 CONDITIONAL — исправить 2 блокера, затем приступать
```

**Блокеры:**
1. Понизить C1 (CSP/nginx) с CRITICAL → LOW — бэкенд уже устанавливает заголовки
2. Понизить H1 (HTTPS) с HIGH → INFO — это инфраструктурная задача, не фронтенд

**После исправления блокеров** план работоспособен. Реальные приоритеты:
1. **P1:** telegram_bot_token (H2→MEDIUM), SW URL validation (L1), SW origin check
2. **P2:** SSE validation, IndexedDB cleanup, credentials: include (после проверки)
3. **P3:** API_BASE_URL унификация, default-section валидация, exportImport refresh
