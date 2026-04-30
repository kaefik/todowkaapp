import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import commonRu from './locales/ru/common.json'
import navRu from './locales/ru/nav.json'
import authRu from './locales/ru/auth.json'
import tasksRu from './locales/ru/tasks.json'
import settingsRu from './locales/ru/settings.json'
import projectsRu from './locales/ru/projects.json'
import notificationsRu from './locales/ru/notifications.json'
import syncRu from './locales/ru/sync.json'
import verbsRu from './locales/ru/verbs.json'
import onboardingRu from './locales/ru/onboarding.json'
import reviewRu from './locales/ru/review.json'
import sessionsRu from './locales/ru/sessions.json'

import commonEn from './locales/en/common.json'
import navEn from './locales/en/nav.json'
import authEn from './locales/en/auth.json'
import tasksEn from './locales/en/tasks.json'
import settingsEn from './locales/en/settings.json'
import projectsEn from './locales/en/projects.json'
import notificationsEn from './locales/en/notifications.json'
import syncEn from './locales/en/sync.json'
import verbsEn from './locales/en/verbs.json'
import onboardingEn from './locales/en/onboarding.json'
import reviewEn from './locales/en/review.json'
import sessionsEn from './locales/en/sessions.json'

const resources = {
  ru: {
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
  },
  en: {
    common: commonEn,
    nav: navEn,
    auth: authEn,
    tasks: tasksEn,
    settings: settingsEn,
    projects: projectsEn,
    notifications: notificationsEn,
    sync: syncEn,
    verbs: verbsEn,
    onboarding: onboardingEn,
    review: reviewEn,
    sessions: sessionsEn,
  },
}

const SUPPORTED_LANGS = ['ru', 'en']

function detectLanguage(): string {
  const stored = localStorage.getItem('i18nextLng')
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored
  const browserLang = navigator.language.slice(0, 2)
  if (SUPPORTED_LANGS.includes(browserLang)) return browserLang
  return 'ru'
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: 'ru',
  ns: ['common', 'nav', 'auth', 'tasks', 'settings', 'projects', 'notifications', 'sync', 'verbs', 'onboarding', 'review', 'sessions'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
})

export { SUPPORTED_LANGS }
export default i18n
