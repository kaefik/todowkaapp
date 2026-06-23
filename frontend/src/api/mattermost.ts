import { httpClient } from './httpClient';

export interface MattermostValidateResponse {
  valid: boolean;
  username?: string;
  mattermost_user_id?: string;
}

export interface MattermostBindResponse {
  success: boolean;
  message: string;
}

export async function validateMattermostToken(token: string, mattermostUrl: string): Promise<MattermostValidateResponse> {
	const resp = await httpClient.post<MattermostValidateResponse>('/mattermost/validate-token', { token, mattermost_url: mattermostUrl });
	return resp.data;
}

export async function bindMattermostAccount(mattermostUserId: string): Promise<MattermostBindResponse> {
	const resp = await httpClient.post<MattermostBindResponse>('/mattermost/bind', { mattermost_user_id: mattermostUserId });
	return resp.data;
}

export async function saveMattermostToken(token: string): Promise<{ success: boolean }> {
	const resp = await httpClient.post<{ success: boolean }>('/mattermost/save-token', { token });
	return resp.data;
}

export async function logoutMattermost(): Promise<{ success: boolean }> {
	const resp = await httpClient.post<{ success: boolean }>('/mattermost/logout');
	return resp.data;
}

export interface MattermostBotBindResponse {
  found: boolean;
  mattermost_user_id?: string;
  username?: string;
  display_name?: string;
  error?: string;
}

export interface MattermostBotStatusResponse {
  bound: boolean;
  bind_mode: string;
  email?: string;
  mattermost_user_id?: string;
  username?: string;
  notifications_enabled: boolean;
}

export async function botBindMattermost(email: string): Promise<MattermostBotBindResponse> {
	const resp = await httpClient.post<MattermostBotBindResponse>('/mattermost/bot/bind', { email });
	return resp.data;
}

export async function botConfirmMattermost(mattermostUserId: string, email: string): Promise<MattermostBindResponse> {
	const resp = await httpClient.post<MattermostBindResponse>('/mattermost/bot/confirm', {
		mattermost_user_id: mattermostUserId,
		email,
	});
	return resp.data;
}

export async function botStatusMattermost(): Promise<MattermostBotStatusResponse> {
	const resp = await httpClient.post<MattermostBotStatusResponse>('/mattermost/bot/status');
	return resp.data;
}

export async function botUnbindMattermost(): Promise<MattermostBindResponse> {
	const resp = await httpClient.post<MattermostBindResponse>('/mattermost/bot/unbind');
	return resp.data;
}
