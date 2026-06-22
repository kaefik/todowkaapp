import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateMattermostToken, saveMattermostToken, logoutMattermost } from '../api/mattermost';

interface MattermostSettingsProps {
  botToken?: string;
  isConnected: boolean;
  notificationsEnabled: boolean;
  mattermostUrl?: string;
  onUpdate: (data: any) => void;
}

export default function MattermostSettings({
  botToken,
  isConnected,
  notificationsEnabled,
  mattermostUrl,
  onUpdate,
}: MattermostSettingsProps) {
  const { t } = useTranslation();
  const [token, setToken] = useState(botToken || '');
  const [url, setUrl] = useState(mattermostUrl || 'http://localhost:8065');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; username?: string } | null>(null);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await onUpdate({ mattermost_url: url });
      const result = await validateMattermostToken(token, url);
      setValidationResult(result);
      if (result.valid) {
        await saveMattermostToken(token);
        onUpdate({ mattermost_bot_token: token });
      }
    } catch (err) {
      setValidationResult({ valid: false });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDisconnect = async () => {
    await logoutMattermost();
    setToken('');
    setValidationResult(null);
    onUpdate({ mattermost_user_id: null, mattermost_bot_token: null });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Mattermost</h3>

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
            placeholder="http://localhost:8065"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('settings.mattermostToken', { defaultValue: 'Bot Token' })}
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="xoxb-..."
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            disabled={isValidating || !token || !url}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isValidating ? t('common.loading') : t('settings.validate')}
          </button>

          {isConnected && (
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

        {isConnected && (
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
    </div>
  );
}
