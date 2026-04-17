### L2-01 — Добавить обертку с автоматическим сбросом кэша при ошибках

**Goal:** Обернуть создание persistence в try-catch и добавить автоматический сброс IndexedDB при критических ошибках миграции.
**Input:** Файл `frontend/src/lib/queryClient.ts`
**Output:** Обновленный `frontend/src/lib/queryClient.ts` с оберткой try-catch и автоматическим сбросом кэша
**Done when:** При критической ошибке IndexedDB база автоматически сбрасывается (удаляется), приложение продолжает работать без persistence.
**Acceptance criteria:**
- [ ] Создание persistence обернуто в try-catch
- [ ] При DOMException или других критических ошибках вызывается функция сброса
- [ ] Функция сброса удаляет IndexedDB базу 'todowka-query-cache'
- [ ] При сбросе логируется console.warn с описанием ошибки
- [ ] После сброса QueryClient создается без persistence (без createSyncStoragePersister)
**depends_on:** [L1/01]
**impact:** 5 (исправляет критическую ошибку, предотвращает неработоспособность приложения)
**complexity:** 2 (простая логика)
**risk:** 2 (безопасно, данные теряются только при ошибках)
**priority_score:** (5 × 2 + 2) / 2 = 6.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** В frontend/src/lib/queryClient.ts найдите создание persister. Оберните этот код в try-catch. В catch блоке:
1. Логируйте ошибку через console.error
2. Используйте indexedDB.deleteDatabase('todowka-query-cache') для сброса
3. Логируйте console.warn о сбросе кэша
4. Создайте QueryClient без persister (если сброс прошел успешно)
Убедитесь, что это работает асинхронно и не блокирует запуск приложения.
