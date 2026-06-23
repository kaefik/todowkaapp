import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../api/users';
import { validateMattermostToken } from '../api/mattermost';

export default function MattermostBotSettings() {
  const { t } = useTranslation('settings');
  const [settings, setSettings] = useState<{ mattermost_url: string | null; mattermost_bot_token_configured: boolean } | null>(null);
  const [formData, setFormData] = useState({ mattermost_url: '', mattermost_bot_token: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; username?: string } | null>(null);

  const loadSettings = async () => {
    try {
      const data = await usersApi.getMattermostSettings();
      setSettings(data);
      if (data.mattermost_url) {
        setFormData({ mattermost_url: data.mattermost_url, mattermost_bot_token: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const result = await validateMattermostToken(formData.mattermost_bot_token, formData.mattermost_url);
      setValidationResult({ valid: result.valid, username: result.username });
    } catch {
      setValidationResult({ valid: false });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const result = await usersApi.updateMattermostSettings({
        mattermost_url: formData.mattermost_url || null,
        mattermost_bot_token: formData.mattermost_bot_token || null,
      });
      setSettings(result);
      setSaved(true);
      setFormData({ ...formData, mattermost_bot_token: '' });
      setValidationResult(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorSaving'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('mattermostBotSettings', { defaultValue: 'Mattermost Bot' })}
      </h2>
      <div className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('mattermostUrl')}
          </label>
          <input
            type="url"
            value={formData.mattermost_url}
            onChange={(e) => setFormData({ ...formData, mattermost_url: e.target.value })}
            placeholder="http://your-server:8065"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('mattermostBotToken', { defaultValue: 'Bot Token' })}
          </label>
          <input
            type="password"
            value={formData.mattermost_bot_token}
            onChange={(e) => setFormData({ ...formData, mattermost_bot_token: e.target.value })}
            placeholder={settings?.mattermost_bot_token_configured ? '******' : ''}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('mattermostBotTokenHint', { defaultValue: 'Создайте бота: Mattermost → Integrations → Bot Accounts → Add Bot Account' })}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            disabled={isValidating || !formData.mattermost_bot_token || !formData.mattermost_url}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
          >
            {isValidating ? t('common.loading', { defaultValue: 'Загрузка...' }) : t('settings.validate', { defaultValue: 'Проверить' })}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? t('saving', { defaultValue: 'Сохранение...' }) : t('saveChanges')}
          </button>
        </div>

        {validationResult && (
          <div className={`p-2 rounded ${validationResult.valid ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
            {validationResult.valid
              ? `${t('settings.connected', { defaultValue: 'Подключён' })} @${validationResult.username}`
              : t('settings.invalidToken', { defaultValue: 'Невалидный токен' })}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-600 dark:text-green-400">{t('smtpSaved', { defaultValue: 'Сохранено' })}</p>}

        {settings && (
          <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
            {settings.mattermost_bot_token_configured
              ? <span className="text-green-600 dark:text-green-400">{t('mattermostBotConfigured', { defaultValue: 'Бот настроен' })}</span>
              : <span>{t('mattermostBotNotConfigured', { defaultValue: 'Бот не настроен' })}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
