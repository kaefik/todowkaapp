import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateMattermostToken, saveMattermostToken, logoutMattermost } from '../api/mattermost';

interface MattermostSettingsProps {
  botToken?: string;
  isConnected: boolean;
  notificationsEnabled: boolean;
  onUpdate: (data: any) => void;
}

export default function MattermostSettings({
  botToken,
  isConnected,
  notificationsEnabled,
  onUpdate,
}: MattermostSettingsProps) {
  const { t } = useTranslation();
  const [token, setToken] = useState(botToken || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; username?: string } | null>(null);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const result = await validateMattermostToken(token);
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
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Mattermost</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Bot Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="xoxb-..."
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={isValidating || !token}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isValidating ? t('common.loading') : t('settings.validate')}
        </button>

        {isConnected && (
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            {t('settings.disconnect')}
          </button>
        )}
      </div>

      {validationResult && (
        <div className={`p-2 rounded ${validationResult.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
          />
          <label>{t('settings.mattermostNotifications')}</label>
        </div>
      )}
    </div>
  );
}
