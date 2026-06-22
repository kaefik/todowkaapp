import api from './api';

export interface MattermostValidateResponse {
  valid: boolean;
  username?: string;
}

export interface MattermostBindResponse {
  success: boolean;
  message: string;
}

export async function validateMattermostToken(token: string): Promise<MattermostValidateResponse> {
  const resp = await api.post<MattermostValidateResponse>('/api/mattermost/validate-token', { token });
  return resp.data;
}

export async function bindMattermostAccount(mattermostUserId: string): Promise<MattermostBindResponse> {
  const resp = await api.post<MattermostBindResponse>('/api/mattermost/bind', { mattermost_user_id: mattermostUserId });
  return resp.data;
}

export async function saveMattermostToken(token: string): Promise<{ success: boolean }> {
  const resp = await api.post<{ success: boolean }>('/api/mattermost/save-token', { token });
  return resp.data;
}

export async function logoutMattermost(): Promise<{ success: boolean }> {
  const resp = await api.post<{ success: boolean }>('/api/mattermost/logout');
  return resp.data;
}
