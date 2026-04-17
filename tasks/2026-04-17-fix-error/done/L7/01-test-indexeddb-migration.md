### L7-01 — Написать тест миграции IndexedDB

**Goal:** Создать автоматический тест для проверки корректности миграции IndexedDB с версии 1 на 2.
**Input:** Файл `frontend/src/lib/queryClient.ts`, структура тестов frontend
**Output:** Тестовый файл `frontend/src/lib/__tests__/queryClient.test.ts` с тестами миграции
**Done when:** Тест проверяет что данные корректно мигрируются из старой схемы в новую.
**Acceptance criteria:**
- [ ] Создан тестовый файл queryClient.test.ts
- [ ] Тест создает IndexedDB с версией 1 (старая схема)
- [ ] Тест вызывает функцию миграции (симулирует upgrade)
- [ ] Тест проверяет что object store 'cache' создан
- [ ] Тест проверяет что данные перенесены корректно
- [ ] Тест проверяет что старые object stores удалены
**depends_on:** [L1/01, L2/01]
**impact:** 3 (обеспечивает надежность миграции)
**complexity:** 3 (требует настройки тестового окружения IndexedDB)
**risk:** 1 (безопасно, только тесты)
**priority_score:** (3 × 2 + 1) / 3 = 2.33
**Est. effort:** M (2h)
**LLM Prompt Hint:** Создайте файл frontend/src/lib/__tests__/queryClient.test.ts. Используйте тестовый фреймворк проекта (вероятно Vitest). Напишите тест:
1. Создайте временную IndexedDB с версией 1 и старой схемой
2. Добавьте тестовые данные в старые object stores
3. Вызовите функцию миграции (или симулируйте onupgradeneeded)
4. Проверьте что данные присутствуют в новом object store 'cache'
5. Проверьте что старые object stores удалены
Используйте beforeEach/afterEach для очистки.
