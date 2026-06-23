import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  validateMattermostToken,
  saveMattermostToken,
  logoutMattermost,
  botBindMattermost,
  botConfirmMattermost,
  botStatusMattermost,
  botUnbindMattermost,
} from '../api/mattermost';

interface MattermostSettingsProps {
  botToken?: string;
  isConnected: boolean;
  notificationsEnabled: boolean;
  mattermostUrl?: string;
  mattermostEmail?: string;
  mattermostBindMode?: string;
  onUpdate: (data: Record<string, unknown>) => void;
}

export default function MattermostSettings({
  botToken,
  isConnected,
  notificationsEnabled,
  mattermostUrl,
  mattermostEmail,
  mattermostBindMode = 'pat',
  onUpdate,
}: MattermostSettingsProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'bot' | 'pat'>(mattermostBindMode === 'bot' ? 'bot' : 'pat');

  // PAT mode state
  const [token, setToken] = useState(botToken || '');
  const [url, setUrl] = useState(mattermostUrl || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; username?: string } | null>(null);

  // Bot mode state
  const [email, setEmail] = useState(mattermostEmail || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    mattermost_user_id?: string;
    username?: string;
    display_name?: string;
    error?: string;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [botStatus, setBotStatus] = useState<{
    bound: boolean;
    username?: string;
    email?: string;
  } | null>(null);

  const loadBotStatus = async () => {
    try {
      const status = await botStatusMattermost();
      setBotStatus(status);
    } catch {
      setBotStatus(null);
    }
  };

  useEffect(() => {
    if (mode === 'bot') {
      loadBotStatus();
    }
  }, [mode]);

  // PAT handlers
  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await onUpdate({ mattermost_url: url });
      const result = await validateMattermostToken(token, url);
      setValidationResult(result);
      if (result.valid) {
        await saveMattermostToken(token);
        onUpdate({
          mattermost_bot_token: token,
          mattermost_user_id: result.mattermost_user_id,
          mattermost_bind_mode: 'pat',
        });
      }
    } catch {
      setValidationResult({ valid: false });
    } finally {
      setIsValidating(false);
    }
  };

  // Bot handlers
  const handleSearch = async () => {
    setIsSearching(true);
    setSearchResult(null);
    try {
      const result = await botBindMattermost(email);
      setSearchResult(result);
    } catch {
      setSearchResult({ found: false, error: 'Search failed' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = async () => {
    if (!searchResult?.mattermost_user_id) return;
    setIsConfirming(true);
    try {
      await botConfirmMattermost(searchResult.mattermost_user_id, email);
      onUpdate({
        mattermost_user_id: searchResult.mattermost_user_id,
        mattermost_email: email,
        mattermost_bind_mode: 'bot',
        mattermost_notifications_enabled: true,
      });
      setBotStatus({
        bound: true,
        username: searchResult.username,
        email,
      });
      setSearchResult(null);
    } catch {
      // handle error
    } finally {
      setIsConfirming(false);
    }
  };

  const handleUnbind = async () => {
    try {
      await botUnbindMattermost();
      onUpdate({
        mattermost_user_id: null,
        mattermost_email: null,
        mattermost_bind_mode: 'pat',
        mattermost_notifications_enabled: false,
      });
      setBotStatus(null);
    } catch {
      // handle error
    }
  };

  const handleDisconnect = async () => {
    await logoutMattermost();
    setToken('');
    setValidationResult(null);
    onUpdate({ mattermost_user_id: null, mattermost_bot_token: null, mattermost_bind_mode: 'pat' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Mattermost</h3>

      <div className="space-y-4">
        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('bot')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'bot'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t('settings.mattermostBot', { defaultValue: 'Бот' })}
          </button>
          <button
            onClick={() => setMode('pat')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'pat'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t('settings.mattermostPat', { defaultValue: 'PAT' })}
          </button>
        </div>

        {/* Bot mode */}
        {mode === 'bot' && (
          <div className="space-y-4">
            {botStatus?.bound ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-md text-green-800 dark:text-green-400">
                  {t('settings.mattermostBotBound', { defaultValue: 'Привязан к' })} @{botStatus.username} ({botStatus.email})
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => onUpdate({ mattermost_notifications_enabled: e.target.checked })}
                    className="rounded"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">{t('settings.mattermostNotifications')}</label>
                </div>
                <button
                  onClick={handleUnbind}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  {t('settings.mattermostUnbind', { defaultValue: 'Отвязать' })}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.mattermostEmail', { defaultValue: 'Email в Mattermost' })}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="user@example.com"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !email}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSearching ? t('common.loading') : t('settings.mattermostSearch', { defaultValue: 'Найти пользователя' })}
                </button>

                {searchResult && (
                  <div className={`p-3 rounded ${searchResult.found ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'}`}>
                    {searchResult.found ? (
                      <div className="space-y-2">
                        <div>
                          {t('settings.mattermostFound', { defaultValue: 'Найден' })}: @{searchResult.username}
                          {searchResult.display_name && ` (${searchResult.display_name})`}
                        </div>
                        <button
                          onClick={handleConfirm}
                          disabled={isConfirming}
                          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                        >
                          {isConfirming ? t('common.loading') : t('settings.mattermostConfirm', { defaultValue: 'Привязать аккаунт' })}
                        </button>
                      </div>
                    ) : (
                      searchResult.error || t('settings.mattermostNotFound', { defaultValue: 'Пользователь не найден' })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PAT mode */}
        {mode === 'pat' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.mattermostUrl', { defaultValue: 'Mattermost Server URL' })}
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="http://your-server:8065"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.mattermostToken', { defaultValue: 'Personal Access Token' })}
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={t('settings.mattermostTokenPlaceholder', { defaultValue: 'вставьте ваш Personal Access Token' })}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('settings.mattermostTokenHint', {
                  defaultValue: 'Создайте токен: Mattermost → Integrations → Personal Access Tokens → Create New Token',
                })}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleValidate}
                disabled={isValidating || !token || !url}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {isValidating ? t('common.loading') : t('settings.validate')}
              </button>

              {isConnected && mattermostBindMode === 'pat' && (
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  {t('settings.disconnect')}
                </button>
              )}
            </div>

            {validationResult && (
              <div className={`p-2 rounded ${validationResult.valid ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                {validationResult.valid
                  ? `${t('settings.connected')} @${validationResult.username}`
                  : t('settings.invalidToken')}
              </div>
            )}

            {isConnected && mattermostBindMode === 'pat' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => onUpdate({ mattermost_notifications_enabled: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">{t('settings.mattermostNotifications')}</label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
