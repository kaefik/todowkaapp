import 'fake-indexeddb/auto'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

import commonRu from '../i18n/locales/ru/common.json'
import navRu from '../i18n/locales/ru/nav.json'
import authRu from '../i18n/locales/ru/auth.json'
import tasksRu from '../i18n/locales/ru/tasks.json'
import settingsRu from '../i18n/locales/ru/settings.json'
import projectsRu from '../i18n/locales/ru/projects.json'
import notificationsRu from '../i18n/locales/ru/notifications.json'
import syncRu from '../i18n/locales/ru/sync.json'
import verbsRu from '../i18n/locales/ru/verbs.json'
import onboardingRu from '../i18n/locales/ru/onboarding.json'
import reviewRu from '../i18n/locales/ru/review.json'
import sessionsRu from '../i18n/locales/ru/sessions.json'

const translations: Record<string, Record<string, string>> = {
  common: commonRu,
  nav: navRu,
  auth: authRu,
  tasks: tasksRu,
  settings: settingsRu,
  projects: projectsRu,
  notifications: notificationsRu,
  sync: syncRu,
  verbs: verbsRu,
  onboarding: onboardingRu,
  review: reviewRu,
  sessions: sessionsRu,
}

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string | string[]) => {
    const defaultNs = (Array.isArray(ns) ? ns[0] : ns) || 'common'
    const t = (key: string, opts?: Record<string, unknown>) => {
      const namespace = (opts?.ns as string) || defaultNs
      const bundle = translations[namespace] ?? {}
      let val = bundle[key] ?? key
      if (opts) {
        for (const [k, v] of Object.entries(opts)) {
          if (k === 'ns') continue
          val = val.replace(`{{${k}}}`, String(v))
        }
      }
      return val
    }
    return { t, i18n: { language: 'ru' } }
  },
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ children }: { children: React.ReactNode }) => children,
}))

expect.extend(matchers)

afterEach(() => {
  cleanup()
})
