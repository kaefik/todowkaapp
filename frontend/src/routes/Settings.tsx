import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useBrowserNotifications } from '../hooks/useBrowserNotifications'
import { useToastStore } from '../stores/toastStore'
import { usersApi } from '../api/users'
import type { User } from '../api/users'
import { VerbSettings } from '../components/VerbSettings'
import { BackupScheduleSettings } from '../components/BackupScheduleSettings'
import { DeleteAccountModal } from '../components/DeleteAccountModal'
import { exportImportApi } from '../api/exportImport'
import { performInitialSync } from '../db/init'

type Theme = 'light' | 'dark'
type Tab = 'general' | 'appearance' | 'profile' | 'security' | 'verbs' | 'users' | 'backup'

function SettingsContent() {
  const { t, i18n } = useTranslation('settings')
  const { t: tNav } = useTranslation('nav')

  const POPULAR_TIMEZONES = [
    { name: t('timezoneMoscow', { ns: 'auth' }), value: 'Europe/Moscow' },
    { name: t('timezoneLondon', { ns: 'auth' }), value: 'Europe/London' },
    { name: t('timezoneNewYork', { ns: 'auth' }), value: 'America/New_York' },
    { name: t('timezoneTokyo', { ns: 'auth' }), value: 'Asia/Tokyo' },
    { name: t('timezoneBerlin', { ns: 'auth' }), value: 'Europe/Berlin' },
    { name: t('timezoneParis', { ns: 'auth' }), value: 'Europe/Paris' },
    { name: t('timezoneSydney', { ns: 'auth' }), value: 'Australia/Sydney' },
    { name: t('timezoneDubai', { ns: 'auth' }), value: 'Asia/Dubai' },
    { name: t('timezoneKiev', { ns: 'auth' }), value: 'Europe/Kiev' },
    { name: t('timezoneSpb', { ns: 'auth' }), value: 'Europe/Moscow' },
    { name: t('timezoneEkb', { ns: 'auth' }), value: 'Asia/Yekaterinburg' },
    { name: t('timezoneNovosibirsk', { ns: 'auth' }), value: 'Asia/Novosibirsk' },
    { name: t('timezoneVladivostok', { ns: 'auth' }), value: 'Asia/Vladivostok' },
    { name: t('timezoneKaliningrad', { ns: 'auth' }), value: 'Europe/Kaliningrad' },
  ]
  const { user, setCurrentUser } = useAuthStore()
  const browserNotifications = useBrowserNotifications()
  const addToast = useToastStore((s) => s.addToast)
  const [activeTab, setActiveTab] = useLocalStorage<Tab>(
    'ui-settings-active-tab',
    'general'
  )
  const [showTaskCounts, setShowTaskCounts] = useLocalStorage('show-task-counts', true)
  const [searchCaseSensitive, setSearchCaseSensitive] = useLocalStorage('search-case-sensitive', false)
  const [searchWholeWord, setSearchWholeWord] = useLocalStorage('search-whole-word', false)

  const savedTheme = localStorage.getItem('theme') as Theme | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const [theme, setTheme] = useState<Theme>(savedTheme || (prefersDark ? 'dark' : 'light'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [timezone, setTimezone] = useState(user?.timezone || 'Europe/Moscow')
  const [customTimezone, setCustomTimezone] = useState('')
  const [defaultSection, setDefaultSection] = useState(user?.default_section || 'inbox')
  const [sectionSaving, setSectionSaving] = useState(false)
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramValidating, setTelegramValidating] = useState(false)
  const [telegramValidationResult, setTelegramValidationResult] = useState<{ valid: boolean; bot_username?: string; bot_name?: string } | null>(null)
  const [telegramSaving, setTelegramSaving] = useState(false)
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setEmail(user.email)
      setTimezone(user.timezone || 'Europe/Moscow')
      setDefaultSection(user.default_section || 'inbox')
    }
  }, [user])

  const DEFAULT_SECTIONS = useMemo(() => [
    {
      group: tNav('groupGtd'),
      items: [
        { value: 'inbox', label: tNav('inbox') },
        { value: 'active', label: tNav('active') },
        { value: 'today', label: tNav('today') },
        { value: 'tomorrow', label: tNav('tomorrow') },
        { value: 'next', label: tNav('nextActions') },
        { value: 'waiting', label: tNav('waitingFor') },
        { value: 'someday', label: tNav('someday') },
      ],
    },
    {
      group: tNav('groupView'),
      items: [
        { value: 'completed', label: tNav('completed') },
        { value: 'trash', label: tNav('trash') },
      ],
    },
    {
      group: tNav('groupManage'),
      items: [
        { value: 'projects', label: tNav('projects') },
        { value: 'contexts', label: tNav('contexts') },
        { value: 'areas', label: tNav('areas') },
        { value: 'tags', label: tNav('tags') },
      ],
    },
  ], [tNav])

  const handleDefaultSectionChange = async (value: string) => {
    setDefaultSection(value)
    localStorage.setItem('default-section', value)
    setSectionSaving(true)
    try {
      const updatedUser = await usersApi.updateCurrentUser({ default_section: value })
      setCurrentUser(updatedUser)
    } catch {
      addToast({ title: t('errorSaving'), body: '', type: 'error' })
    } finally {
      setSectionSaving(false)
    }
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      await exportImportApi.exportData()
      addToast({ title: t('exportSuccess'), body: '', type: 'success' })
    } catch {
      addToast({ title: t('importError'), body: '', type: 'error' })
    } finally {
      setExportLoading(false)
    }
  }

  const handleImport = async (file: File) => {
    if (!confirm(t('confirmImport'))) return
    setImportLoading(true)
    try {
      const report = await exportImportApi.importData(file)
      addToast({
        title: t('importSuccess', {
          tasks: report.imported.tasks || 0,
          projects: report.imported.projects || 0,
        }),
        body: '',
        type: 'success',
      })
      if (user?.id) {
        await performInitialSync(user.id)
      }
    } catch {
      addToast({ title: t('importError'), body: '', type: 'error' })
    } finally {
      setImportLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(false)

    try {
      const updatedUser = await usersApi.updateCurrentUser({
        username,
        email,
        timezone,
      })
      
      const { setCurrentUser } = useAuthStore.getState()
      setCurrentUser(updatedUser)
      
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const tabs: { key: Tab; label: string; adminOnly: boolean }[] = [
    { key: 'general', label: t('tabGeneral'), adminOnly: false },
    { key: 'appearance', label: t('tabAppearance'), adminOnly: false },
    { key: 'profile', label: t('tabProfile'), adminOnly: false },
    { key: 'security', label: t('tabSecurity'), adminOnly: false },
    { key: 'verbs', label: t('tabVerbs'), adminOnly: false },
    { key: 'backup', label: t('tabBackup'), adminOnly: false },
    { key: 'users', label: t('tabUsers'), adminOnly: true },
  ]

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || user?.is_admin)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-0">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'general' && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('defaultSection')}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('defaultSectionLabel')}
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {t('defaultSectionHint')}
              </p>
              <select
                value={defaultSection}
                onChange={(e) => handleDefaultSectionChange(e.target.value)}
                disabled={sectionSaving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
              >
                {DEFAULT_SECTIONS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.items.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('browserNotifications')}</h2>

            {!browserNotifications.supported ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  {t('notificationsNotSupported')}
                </p>
              </div>
            ) : browserNotifications.permission === 'denied' ? (
              <div className="space-y-3">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {t('notificationsBlocked')}
                  </p>
                </div>
                {browserNotifications.enabled && (
                  <button
                    onClick={browserNotifications.disable}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {t('disableNotifications')}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('notificationsDescription')}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t('browserNotificationsLabel')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {browserNotifications.enabled
                        ? t('notificationsEnabled')
                        : t('notificationsDisabled')}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (browserNotifications.enabled) {
                        browserNotifications.disable()
                      } else {
                        const ok = await browserNotifications.enable()
                        if (!ok) {
                          addToast({
                            title: t('enableNotificationsFailed'),
                            body: browserNotifications.permission === 'denied'
                              ? t('notificationsBlockedMsg')
                              : t('notificationsPermissionFailed'),
                            type: 'error',
                          })
                        }
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      browserNotifications.enabled
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={browserNotifications.enabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        browserNotifications.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {browserNotifications.enabled && (
                    <button
                      onClick={async () => {
                        const ok = await browserNotifications.showNotification(
                          t('testNotificationTitle'),
                          t('testNotificationBody'),
                          'test-notification'
                        )
                        if (!ok) {
                          addToast({
                            title: t('testNotificationTitle'),
                            body: t('testNotificationBody'),
                            type: 'info',
                          })
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                    >
                      {t('sendTestNotification')}
                    </button>
                  )}
                </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('telegramTitle')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('telegramDescription')}</p>

            {telegramMessage && (
              <div className={`mb-3 p-3 rounded-lg text-sm ${
                telegramMessage.includes('Ошибка') || telegramMessage.includes('Error')
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              }`}>
                {telegramMessage}
              </div>
            )}

            {!user?.telegram_chat_id ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={telegramToken}
                    onChange={(e) => { setTelegramToken(e.target.value); setTelegramValidationResult(null) }}
                    placeholder={t('telegramBotTokenPlaceholder')}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                  />
                  <button
                    onClick={async () => {
                      if (!telegramToken.trim()) return
                      setTelegramValidating(true)
                      try {
                        const result = await usersApi.validateTelegramToken(telegramToken.trim())
                        setTelegramValidationResult(result)
                        if (!result.valid) setTelegramToken('')
                      } catch { setTelegramValidationResult({ valid: false }) }
                      finally { setTelegramValidating(false) }
                    }}
                    disabled={telegramValidating || !telegramToken.trim()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50"
                  >
                    {telegramValidating ? t('telegramValidating') : t('telegramValidateBtn')}
                  </button>
                </div>

                {telegramValidationResult?.valid && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {t('telegramValid', { name: telegramValidationResult.bot_name || '', username: telegramValidationResult.bot_username || '' })}
                  </p>
                )}
                {telegramValidationResult && !telegramValidationResult.valid && (
                  <p className="text-sm text-red-600 dark:text-red-400">{t('telegramInvalid')}</p>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400">{t('telegramBotTokenHint')}</p>

                {telegramValidationResult?.valid && (
                  <button
                    onClick={async () => {
                      setTelegramSaving(true)
                      setTelegramMessage(null)
                      try {
                        const updated = await usersApi.updateCurrentUser({ telegram_bot_token: telegramToken.trim() })
                        setCurrentUser(updated)
                        setTelegramMessage(t('telegramTokenSaved'))
                        setTelegramValidationResult(null)
                      } catch { setTelegramMessage(t('telegramErrorSaving')) }
                      finally { setTelegramSaving(false) }
                    }}
                    disabled={telegramSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {telegramSaving ? '...' : t('telegramSaveToken')}
                  </button>
                )}

                {user?.telegram_bot_token && !user.telegram_chat_id && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">{t('telegramStatusWaiting')}</p>
                )}

                {!user?.telegram_bot_token && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('telegramStatusNotConnected')}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-green-600 dark:text-green-400">{t('telegramStatusConnected')}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t('telegramEnableNotifications')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.telegram_notifications_enabled
                        ? t('telegramNotificationsEnabled')
                        : t('telegramNotificationsDisabled')}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const updated = await usersApi.updateCurrentUser({
                          telegram_notifications_enabled: !user.telegram_notifications_enabled,
                        })
                        setCurrentUser(updated)
                      } catch { setTelegramMessage(t('telegramErrorSaving')) }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      user.telegram_notifications_enabled
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={user.telegram_notifications_enabled}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      user.telegram_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <button
                  onClick={async () => {
                    setTelegramSaving(true)
                    setTelegramMessage(null)
                    try {
                      const updated = await usersApi.updateCurrentUser({ telegram_bot_token: '' })
                      setCurrentUser(updated)
                      setTelegramToken('')
                      setTelegramMessage(t('telegramTokenRemoved'))
                    } catch { setTelegramMessage(t('telegramErrorSaving')) }
                    finally { setTelegramSaving(false) }
                  }}
                  disabled={telegramSaving}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  {t('telegramRemoveToken')}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('language')}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('languageLabel')}
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {t('languageHint')}
              </p>
              <select
                value={i18n.language}
                onChange={(e) => {
                    localStorage.setItem('i18nextLng', e.target.value)
                    i18n.changeLanguage(e.target.value)
                  }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('aboutApp')}</h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p><strong>{t('aboutVersion')}:</strong> 1.0.0</p>
              <p><strong>{t('aboutName')}:</strong> Todowka</p>
              <p>{t('aboutAppDescription')}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('dataManagement')}</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('resetUiDescription')}
                </p>
                <button
                  onClick={() => {
                    if (confirm(t('confirmResetUi'))) {
                      Object.keys(localStorage)
                        .filter(key => key.startsWith('ui-'))
                        .forEach(key => localStorage.removeItem(key))
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
                >
                  {t('resetUiButton')}
                </button>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('exportDescription')}
                </p>
                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50"
                >
                  {exportLoading ? t('exporting') : t('exportData')}
                </button>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('importDescription')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImport(file)
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50"
                >
                  {importLoading ? t('importing') : t('importData')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'appearance' && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('appearance')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('theme')}
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                      theme === 'light'
                        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300 dark:border-gray-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('themeLight')}</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                      theme === 'dark'
                        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-900 dark:bg-gray-100" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('themeDark')}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('capitalizeFirstLabel')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('capitalizeFirstHint')}
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const updated = await usersApi.updateCurrentUser({
                      capitalize_first: !user?.capitalize_first,
                    })
                    setCurrentUser(updated)
                  } catch {
                    addToast({ title: t('errorSaving'), body: '', type: 'error' })
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  user?.capitalize_first !== false
                    ? 'bg-indigo-600 dark:bg-indigo-500'
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={user?.capitalize_first !== false}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    user?.capitalize_first !== false ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('showTaskCountsLabel')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('showTaskCountsHint')}
                </p>
              </div>
              <button
                onClick={() => setShowTaskCounts(!showTaskCounts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  showTaskCounts
                    ? 'bg-indigo-600 dark:bg-indigo-500'
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={showTaskCounts}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showTaskCounts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('searchSettingsTitle')}</h3>
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t('searchCaseSensitiveLabel')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('searchCaseSensitiveHint')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSearchCaseSensitive(!searchCaseSensitive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      searchCaseSensitive
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={searchCaseSensitive}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        searchCaseSensitive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t('searchWholeWordLabel')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('searchWholeWordHint')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSearchWholeWord(!searchWholeWord)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      searchWholeWord
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={searchWholeWord}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        searchWholeWord ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('editProfile')}</h2>
          
          {profileError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {profileError}
            </div>
          )}

          {profileSuccess && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
              {t('profileUpdated')}
            </div>
          )}

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('usernameLabel')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                minLength={3}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('emailLabel')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('timezoneLabel')}
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {t('timezoneHint')}
              </p>
              
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {POPULAR_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.name}
                  </option>
                ))}
              </select>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('customTimezoneLabel')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTimezone}
                    onChange={(e) => setCustomTimezone(e.target.value)}
                    placeholder="Europe/Moscow"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customTimezone.trim()) {
                        setTimezone(customTimezone.trim())
                        setCustomTimezone('')
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-sm font-medium rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                  >
                    {t('saveChanges')}
                  </button>
                </div>
              </div>

              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>{t('currentTimezone')}</strong> {timezone}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-sm font-medium rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'verbs' && (
        <VerbSettings />
      )}
      {activeTab === 'users' && user?.is_admin && <UsersTab currentUser={user} />}
      {activeTab === 'backup' && <BackupScheduleSettings user={user!} />}
    </div>
  )
}

function SecurityTab() {
  const { t } = useTranslation('settings')
  const addToast = useToastStore((s) => s.addToast)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const validate = (): string | null => {
    if (!currentPassword) return t('enterCurrentPassword')
    if (!newPassword) return t('enterNewPassword')
    if (newPassword.length < 8) return t('passwordMinLength')
    if (!/\d/.test(newPassword)) return t('passwordNeedDigit')
    if (!/\p{Lu}/u.test(newPassword)) return t('passwordNeedUppercase')
    if (!/[^\p{L}\p{N}]/u.test(newPassword)) return t('passwordNeedSpecial')
    if (newPassword !== confirmPassword) return t('passwordsDontMatch')
    if (currentPassword === newPassword) return t('passwordSameAsCurrent')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await usersApi.changePassword(currentPassword, newPassword)
      addToast({ title: t('passwordChanged'), body: t('passwordChangedBody'), type: 'success' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      if (err instanceof Error && 'status' in err) {
        const apiErr = err as { status: number; message: string }
        if (apiErr.status === 400) {
          setError(apiErr.message || t('wrongCurrentPassword'))
        } else if (apiErr.status === 422) {
          setError(t('newPasswordInvalid'))
        } else {
          setError(apiErr.message || t('passwordChangeError'))
        }
      } else {
        setError(t('passwordChangeError'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('changePassword')}</h2>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('currentPassword')}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <button
                type="button"
                onMouseDown={() => setShowCurrent(true)}
                onMouseUp={() => setShowCurrent(false)}
                onMouseLeave={() => setShowCurrent(false)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('newPassword')}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                minLength={8}
              />
              <button
                type="button"
                onMouseDown={() => setShowNew(true)}
                onMouseUp={() => setShowNew(false)}
                onMouseLeave={() => setShowNew(false)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('passwordRequirements')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('confirmNewPassword')}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <button
                type="button"
                onMouseDown={() => setShowConfirm(true)}
                onMouseUp={() => setShowConfirm(false)}
                onMouseLeave={() => setShowConfirm(false)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-sm font-medium rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('saving') : t('changePasswordBtn')}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border border-red-200 dark:border-red-800">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">{t('deleteAccount')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('deleteAccountDescription')}</p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
        >
          {t('deleteAccountBtn')}
        </button>
        <DeleteAccountModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} />
      </div>
    </>
  )
}

function UsersTab({ currentUser }: { currentUser: User }) {
  const { t, i18n } = useTranslation('settings')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await usersApi.getAll()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleBlock = async (userId: string) => {
    if (!window.confirm(t('confirmBlock'))) {
      return
    }

    try {
      setActionLoading(userId)
      await usersApi.blockUser(userId)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnblock = async (userId: string) => {
    if (!window.confirm(t('confirmUnblock'))) {
      return
    }

    try {
      setActionLoading(userId)
      await usersApi.unblockUser(userId)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblock user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!window.confirm(t('confirmDeleteUser'))) {
      return
    }

    try {
      setActionLoading(userId)
      await usersApi.deleteUser(userId)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('userManagement')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('totalUsers', { count: 0 })}</p>
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('noUsers')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('userManagement')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('totalUsers', { count: users.length })}</p>

        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('user')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('emailLabel')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('userTimezone')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('active')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('administrator')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('registrationDate')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('lastLogin')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                          {u.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {u.username}
                        {currentUser.id === u.id && (
                          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">{t('you')}</span>
                        )}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {u.timezone || 'Europe/Moscow'}
              </td>
              <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        {t('active')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                        {t('blocked')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                        {t('administrator')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                        {t('userRole')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(u.created_at).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : t('neverLoggedIn')}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {currentUser.id !== u.id && !u.is_admin && (
                      <div className="flex justify-end gap-2">
                        {u.is_active ? (
                          <button
                            onClick={() => handleBlock(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 disabled:opacity-50"
                          >
                            {actionLoading === u.id ? '...' : t('block')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnblock(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50"
                          >
                            {actionLoading === u.id ? '...' : t('unblock')}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoading === u.id}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          {actionLoading === u.id ? '...' : t('delete', { ns: 'common' })}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function Settings() {
  return <SettingsContent />
}
