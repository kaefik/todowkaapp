# Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three-step onboarding wizard (language → timezone → default section) shown on first login from each device.

**Architecture:** New `/onboarding` route with a full-screen wizard outside AppLayout. Backend stores `language` field on User model. Frontend uses `localStorage('onboarding-complete')` to track per-device completion. On completion, saves all three values via PATCH `/api/users/me` and redirects to the chosen default section.

**Tech Stack:** Python/FastAPI/SQLAlchemy/Alembic (backend), React/TypeScript/i18next/Tailwind (frontend)

---

### Task 1: Backend — Add `language` field to User model

**Files:**
- Modify: `backend/app/models/user.py:19` (add field after `default_section`)
- Modify: `backend/app/schemas/user.py` (add to `UserResponse` and `UserUpdate`)

- [ ] **Step 1: Add `language` column to User model**

In `backend/app/models/user.py`, add after line 20 (`default_section`):

```python
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
```

- [ ] **Step 2: Add `language` to `UserResponse` schema**

In `backend/app/schemas/user.py`, add after line 32 (`default_section`):

```python
    language: str | None = None
```

- [ ] **Step 3: Add `language` to `UserUpdate` schema**

In `backend/app/schemas/user.py`, add after line 53 (`default_section` in `UserUpdate`):

```python
    language: str | None = Field(default=None, max_length=10)
```

- [ ] **Step 4: Create Alembic migration**

Run:
```bash
cd backend && alembic revision --autogenerate -m "add language field to user"
```

- [ ] **Step 5: Apply migration**

Run:
```bash
cd backend && alembic upgrade head
```

- [ ] **Step 6: Verify backend starts**

Run:
```bash
cd backend && python -c "from app.models.user import User; print('OK')"
```

Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/user.py backend/app/schemas/user.py backend/alembic/
git commit -m "feat: add language field to User model"
```

---

### Task 2: Frontend — Update types and API for `language`

**Files:**
- Modify: `frontend/src/stores/authStore.ts:6-18` (User interface)
- Modify: `frontend/src/api/users.ts:3-15` (User interface + updateCurrentUser)

- [ ] **Step 1: Add `language` to User interface in authStore**

In `frontend/src/stores/authStore.ts`, add after line 13 (`default_section`):

```typescript
  language: string | null
```

- [ ] **Step 2: Add `language` to User interface in usersApi**

In `frontend/src/api/users.ts`, add after line 10 (`default_section`):

```typescript
  language: string | null
```

- [ ] **Step 3: Add `language` to `updateCurrentUser` type signature**

In `frontend/src/api/users.ts`, line 23, add `'language'` to the `Pick` type:

```typescript
  updateCurrentUser: async (data: Partial<Pick<User, 'username' | 'email' | 'timezone' | 'default_section' | 'language' | 'telegram_bot_token' | 'telegram_notifications_enabled'>>): Promise<User> => {
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/stores/authStore.ts frontend/src/api/users.ts
git commit -m "feat: add language to frontend User types"
```

---

### Task 3: Frontend — Create onboarding i18n namespace

**Files:**
- Create: `frontend/src/i18n/locales/ru/onboarding.json`
- Create: `frontend/src/i18n/locales/en/onboarding.json`
- Modify: `frontend/src/i18n/index.ts` (register namespace)

- [ ] **Step 1: Create Russian onboarding translations**

Create `frontend/src/i18n/locales/ru/onboarding.json`:

```json
{
  "title": "Добро пожаловать в Todowka",
  "stepLanguage": "Выберите язык",
  "stepLanguageDesc": "Выберите язык интерфейса. Вы сможете изменить его позже в настройках.",
  "stepTimezone": "Часовой пояс",
  "stepTimezoneDesc": "Выберите ваш часовой пояс для корректного отображения дедлайнов и напоминаний.",
  "detectedTimezone": "Определено автоматически:",
  "changeTimezone": "Или выберите другой:",
  "searchTimezone": "Поиск таймзоны...",
  "stepSection": "Раздел по умолчанию",
  "stepSectionDesc": "Какой раздел открывать при входе в приложение?",
  "next": "Далее",
  "start": "Начать работу",
  "progress": "Шаг {{current}} из {{total}}"
}
```

- [ ] **Step 2: Create English onboarding translations**

Create `frontend/src/i18n/locales/en/onboarding.json`:

```json
{
  "title": "Welcome to Todowka",
  "stepLanguage": "Choose Language",
  "stepLanguageDesc": "Select your interface language. You can change it later in settings.",
  "stepTimezone": "Timezone",
  "stepTimezoneDesc": "Select your timezone for correct display of deadlines and reminders.",
  "detectedTimezone": "Auto-detected:",
  "changeTimezone": "Or choose another:",
  "searchTimezone": "Search timezone...",
  "stepSection": "Default Section",
  "stepSectionDesc": "Which section should open when you start the app?",
  "next": "Next",
  "start": "Get Started",
  "progress": "Step {{current}} of {{total}}"
}
```

- [ ] **Step 3: Register namespace in i18n config**

In `frontend/src/i18n/index.ts`, add imports after line 12:

```typescript
import onboardingRu from './locales/ru/onboarding.json'
```

After line 22:

```typescript
import onboardingEn from './locales/en/onboarding.json'
```

Add to `resources.ru` object:

```typescript
    onboarding: onboardingRu,
```

Add to `resources.en` object:

```typescript
    onboarding: onboardingEn,
```

Add `'onboarding'` to the `ns` array on line 63:

```typescript
  ns: ['common', 'nav', 'auth', 'tasks', 'settings', 'projects', 'notifications', 'sync', 'verbs', 'onboarding'],
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/i18n/
git commit -m "feat: add onboarding i18n namespace"
```

---

### Task 4: Frontend — Create OnboardingLanguage component

**Files:**
- Create: `frontend/src/components/OnboardingLanguage.tsx`

- [ ] **Step 1: Create component**

Create `frontend/src/components/OnboardingLanguage.tsx`:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { SUPPORTED_LANGS } from '../i18n'

const LANGUAGE_LABELS: Record<string, { flag: string; name: string }> = {
  ru: { flag: '🇷🇺', name: 'Русский' },
  en: { flag: '🇬🇧', name: 'English' },
}

interface OnboardingLanguageProps {
  onSelect: (language: string) => void
}

export function OnboardingLanguage({ onSelect }: OnboardingLanguageProps) {
  const { t } = useTranslation('onboarding')
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (lang: string) => {
    setSelected(lang)
    i18n.changeLanguage(lang)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('stepLanguage')}
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {t('stepLanguageDesc')}
        </p>
      </div>

      <div className="flex gap-4 w-full max-w-md">
        {SUPPORTED_LANGS.map((lang) => {
          const info = LANGUAGE_LABELS[lang]
          if (!info) return null
          const isSelected = selected === lang
          return (
            <button
              key={lang}
              type="button"
              onClick={() => handleSelect(lang)}
              className={`flex-1 rounded-xl border-2 p-6 text-center transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-4xl">{info.flag}</div>
              <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {info.name}
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
        className="mt-4 rounded-lg bg-indigo-600 dark:bg-indigo-500 px-8 py-3 text-white font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {t('next')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/OnboardingLanguage.tsx
git commit -m "feat: add OnboardingLanguage component"
```

---

### Task 5: Frontend — Create OnboardingTimezone component

**Files:**
- Create: `frontend/src/components/OnboardingTimezone.tsx`

- [ ] **Step 1: Create component**

Create `frontend/src/components/OnboardingTimezone.tsx`:

```tsx
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const POPULAR_TIMEZONES = [
  'Europe/Moscow',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Kiev',
  'Europe/Kaliningrad',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Asia/Yekaterinburg',
  'Asia/Novosibirsk',
  'Asia/Vladivostok',
  'Australia/Sydney',
]

function getTimezoneOffset(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
    const parts = formatter.formatToParts(new Date())
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')
    return offsetPart?.value ?? ''
  } catch {
    return ''
  }
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'Europe/Moscow'
  }
}

interface OnboardingTimezoneProps {
  onSelect: (timezone: string) => void
}

export function OnboardingTimezone({ onSelect }: OnboardingTimezoneProps) {
  const { t } = useTranslation('onboarding')
  const detected = useMemo(() => detectTimezone(), [])
  const [timezone, setTimezone] = useState(detected)
  const [search, setSearch] = useState('')

  const allTimezones = useMemo(() => {
    const set = new Set([detected, ...POPULAR_TIMEZONES])
    try {
      const intl = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      if (intl.supportedValuesOf) {
        for (const tz of intl.supportedValuesOf('timeZone')) {
          set.add(tz)
        }
      }
    } catch {}
    return [...set].sort()
  }, [detected])

  const filtered = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q)).slice(0, 20)
  }, [search, allTimezones])

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('stepTimezone')}
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {t('stepTimezoneDesc')}
        </p>
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3 mb-4">
          <p className="text-sm text-green-700 dark:text-green-400">
            <span className="font-semibold">{t('detectedTimezone')}</span>{' '}
            {timezone} ({getTimezoneOffset(timezone)})
          </p>
        </div>

        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('changeTimezone')}
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchTimezone')}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        />
        {filtered.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {filtered.map((tz) => (
              <button
                key={tz}
                type="button"
                onClick={() => {
                  setTimezone(tz)
                  setSearch('')
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-900 dark:text-gray-100"
              >
                {tz} ({getTimezoneOffset(tz)})
              </button>
            ))}
          </div>
        )}

        <div className="mt-3">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          >
            {POPULAR_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz} ({getTimezoneOffset(tz)})
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(timezone)}
        className="mt-4 rounded-lg bg-indigo-600 dark:bg-indigo-500 px-8 py-3 text-white font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
      >
        {t('next')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/OnboardingTimezone.tsx
git commit -m "feat: add OnboardingTimezone component"
```

---

### Task 6: Frontend — Create OnboardingSection component

**Files:**
- Create: `frontend/src/components/OnboardingSection.tsx`

- [ ] **Step 1: Create component**

Create `frontend/src/components/OnboardingSection.tsx`:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const SECTIONS = [
  { key: 'inbox', icon: '📥' },
  { key: 'active', icon: '⚡' },
  { key: 'today', icon: '📅' },
  { key: 'tomorrow', icon: '📆' },
  { key: 'next', icon: '➡️' },
  { key: 'waiting', icon: '⏳' },
  { key: 'someday', icon: '🔮' },
  { key: 'projects', icon: '📂' },
]

interface OnboardingSectionProps {
  onSelect: (section: string) => void
}

export function OnboardingSection({ onSelect }: OnboardingSectionProps) {
  const { t } = useTranslation('onboarding')
  const { t: tNav } = useTranslation('nav')
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('stepSection')}
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {t('stepSectionDesc')}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
        {SECTIONS.map(({ key, icon }) => {
          const isSelected = selected === key
          const label = tNav(key === 'next' ? 'nextActions' : key === 'waiting' ? 'waitingFor' : key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {label}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
        className="mt-4 rounded-lg bg-indigo-600 dark:bg-indigo-500 px-8 py-3 text-white font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {t('start')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/OnboardingSection.tsx
git commit -m "feat: add OnboardingSection component"
```

---

### Task 7: Frontend — Create OnboardingWizard and Onboarding route

**Files:**
- Create: `frontend/src/components/OnboardingWizard.tsx`
- Create: `frontend/src/routes/Onboarding.tsx`
- Modify: `frontend/src/router.tsx` (add route)

- [ ] **Step 1: Create OnboardingWizard container**

Create `frontend/src/components/OnboardingWizard.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { usersApi } from '../api/users'
import { useAuthStore } from '../stores/authStore'
import { OnboardingLanguage } from './OnboardingLanguage'
import { OnboardingTimezone } from './OnboardingTimezone'
import { OnboardingSection } from './OnboardingSection'

const STEPS = 3

export function OnboardingWizard() {
  const { t } = useTranslation('onboarding')
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [language, setLanguage] = useState<string | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang)
    setStep(1)
  }

  const handleTimezoneSelect = (tz: string) => {
    setTimezone(tz)
    setStep(2)
  }

  const handleSectionSelect = async (section: string) => {
    if (!language || !timezone) return
    setIsSaving(true)
    try {
      const updatedUser = await usersApi.updateCurrentUser({
        language,
        timezone,
        default_section: section,
      })
      const { setCurrentUser } = useAuthStore.getState()
      setCurrentUser(updatedUser)
      localStorage.setItem('default-section', section)
      localStorage.setItem('onboarding-complete', 'true')
      navigate(`/${section}`, { replace: true })
    } catch (err) {
      console.error('Failed to save onboarding data:', err)
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            Todowka
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('progress', { current: step + 1, total: STEPS })}
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step
                  ? 'w-8 bg-indigo-600 dark:bg-indigo-400'
                  : 'w-6 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {step === 0 && <OnboardingLanguage onSelect={handleLanguageSelect} />}
          {step === 1 && <OnboardingTimezone onSelect={handleTimezoneSelect} />}
          {step === 2 && (
            <OnboardingSection onSelect={handleSectionSelect} />
          )}
        </div>

        {isSaving && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Onboarding route page**

Create `frontend/src/routes/Onboarding.tsx`:

```tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { OnboardingWizard } from '../components/OnboardingWizard'

export function Onboarding() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (localStorage.getItem('onboarding-complete')) {
    return <Navigate to="/" replace />
  }

  return <OnboardingWizard />
}
```

- [ ] **Step 3: Add `/onboarding` route to router**

In `frontend/src/router.tsx`, add import after line 23:

```typescript
import { Onboarding } from './routes/Onboarding'
```

Add new route object in the `routes` array, after the `/register` route (line 44) and before the `/` route (line 46):

```typescript
  {
    path: '/onboarding',
    element: <Onboarding />,
  },
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/OnboardingWizard.tsx frontend/src/routes/Onboarding.tsx frontend/src/router.tsx
git commit -m "feat: add OnboardingWizard component and /onboarding route"
```

---

### Task 8: Frontend — Update Login and Register to redirect to onboarding

**Files:**
- Modify: `frontend/src/routes/Login.tsx` (replace timezone modal logic with onboarding redirect)
- Modify: `frontend/src/routes/Register.tsx` (same)

- [ ] **Step 1: Update Login.tsx — remove TimezoneSetupModal, add onboarding redirect**

In `frontend/src/routes/Login.tsx`:

Remove the import on line 8:
```typescript
import { TimezoneSetupModal } from '../components/TimezoneSetupModal'
```

Remove state on line 26:
```typescript
const [showTimezoneModal, setShowTimezoneModal] = useState(false)
```

Replace the `onSubmit` function (lines 43-57) with:

```typescript
  const onSubmit = async (data: LoginFormData) => {
    clearError()
    setIsSubmitting(true)
    try {
      await login(data)
      if (!localStorage.getItem('onboarding-complete')) {
        navigate('/onboarding')
      } else {
        const saved = localStorage.getItem('default-section')
        navigate(saved ? `/${saved}` : '/inbox')
      }
    } catch {
    }
    setIsSubmitting(false)
  }
```

Remove `handleTimezoneSetupComplete` function (lines 59-62).

Remove the `showTimezoneModal` block at the bottom (lines 162-164):
```tsx
      {showTimezoneModal && (
        <TimezoneSetupModal onClose={handleTimezoneSetupComplete} />
      )}
```

- [ ] **Step 2: Update Register.tsx — same changes**

In `frontend/src/routes/Register.tsx`:

Remove the import on line 8:
```typescript
import { TimezoneSetupModal } from '../components/TimezoneSetupModal'
```

Remove state on line 38:
```typescript
const [showTimezoneModal, setShowTimezoneModal] = useState(false)
```

Replace the `onSubmit` function (lines 64-83) with:

```typescript
  const onSubmit = async (data: RegisterFormData) => {
    clearError()
    setIsSubmitting(true)
    try {
      await registerAndLogin({
        username: data.username,
        email: data.email,
        password: data.password,
        invite_code: data.inviteCode && data.inviteCode.trim() ? data.inviteCode.trim() : undefined,
      })
      if (!localStorage.getItem('onboarding-complete')) {
        navigate('/onboarding')
      } else {
        const saved = localStorage.getItem('default-section')
        navigate(saved ? `/${saved}` : '/inbox')
      }
    } catch {
    }
    setIsSubmitting(false)
  }
```

Remove `handleTimezoneSetupComplete` function (lines 85-88).

Remove the `showTimezoneModal` block at the bottom (lines 223-225):
```tsx
      {showTimezoneModal && (
        <TimezoneSetupModal onClose={handleTimezoneSetupComplete} />
      )}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Login.tsx frontend/src/routes/Register.tsx
git commit -m "feat: redirect to onboarding after first login/register"
```

---

### Task 9: Cleanup — Remove TimezoneSetupModal, update docs

**Files:**
- Delete: `frontend/src/components/TimezoneSetupModal.tsx`
- Modify: `docs/features.md` (add onboarding feature)

- [ ] **Step 1: Delete TimezoneSetupModal**

```bash
rm frontend/src/components/TimezoneSetupModal.tsx
```

- [ ] **Step 2: Update features.md**

Add the following entry in the appropriate section of `docs/features.md`:

Under the relevant category, add:

```markdown
### Онбординг (Onboarding)
- Трёхшаговый визард при первом входе с нового устройства
- Шаг 1: Выбор языка интерфейса (динамически из доступных переводов)
- Шаг 2: Выбор часового пояса (автоопределение + ручной выбор)
- Шаг 3: Выбор раздела по умолчанию
- Все настройки сохраняются в бэкенд + localStorage
- Язык хранится в модели User (поле `language`)
- Флаг `onboarding-complete` в localStorage отслеживает прохождение на устройстве
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TimezoneSetupModal.tsx docs/features.md
git commit -m "feat: remove TimezoneSetupModal, update docs"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run backend linting**

```bash
cd backend && ruff check .
```

Expected: no errors related to changed files

- [ ] **Step 2: Run frontend linting**

```bash
cd frontend && npm run lint
```

Expected: no errors

- [ ] **Step 3: Run frontend type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no type errors

- [ ] **Step 4: Manual test — register new user and verify onboarding flow**

1. Start backend: `cd backend && ./run.sh`
2. Start frontend: `cd frontend && ./run.sh`
3. Register a new user
4. Verify: redirected to `/onboarding` (step 1: language)
5. Select language → verify UI switches language
6. Click «Далее» → verify step 2 (timezone) shows detected timezone
7. Click «Далее» → verify step 3 (section) shows section cards
8. Select section → click start button
9. Verify: redirected to chosen section
10. Verify: `localStorage` has `onboarding-complete`, `default-section`, `i18nextLng`
11. Refresh page → verify no onboarding shown
12. Log out and log in again → verify no onboarding shown
