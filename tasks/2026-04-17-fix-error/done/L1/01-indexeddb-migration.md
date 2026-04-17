### L1-01 — Изменить версию IndexedDB и добавить обработчик миграции

**Goal:** Обновить версию IndexedDB с 1 на 2 и добавить обработчик onupgradeneeded для миграции данных.
**Input:** Файл `frontend/src/lib/queryClient.ts`
**Output:** Обновленный `frontend/src/lib/queryClient.ts` с версией базы 2 и обработчиком миграции
**Done when:** IndexedDB использует версию 2, обработчик onupgradeneeded создает object store 'cache' и мигрирует данные.
**Acceptance criteria:**
- [ ] Версия базы данных изменена с `1` на `2`
- [ ] Добавлен обработчик `onupgradeneeded` в asyncStorage
- [ ] Обработчик создает object store 'cache' если его нет
- [ ] Обработчик мигрирует данные из старых object stores если они существуют
- [ ] Старые object stores удаляются после миграции
**depends_on:** []
**impact:** 5 (исправляет критическую ошибку IndexedDB)
**complexity:** 3 (средняя сложность)
**risk:** 3 (есть риск потери данных при ошибке миграции)
**priority_score:** (5 × 2 + 3) / 3 = 4.33
**Est. effort:** M (2h)
**LLM Prompt Hint:** В frontend/src/lib/queryClient.ts найдите создание IndexedDB (обычно через idb или openDB). Измените версию базы с 1 на 2. Добавьте параметр upgrade с функцией, которая:
1. Проверяет старые object stores
2. Создает новый object store 'cache' если его нет
3. Переносит данные из старых stores в новый
4. Удаляет старые stores после успешной миграции
Используйте транзакции для целостности данных.
