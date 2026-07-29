import api from './auth';
import {
  AdminCreateUserPayload,
  AdminUpdateUserPayload,
  AdminUserRecord,
  AiInteractionLogDetail,
  AiInteractionLogSummary,
  Trip,
} from '../types';

export const getAdminUsers = async (): Promise<AdminUserRecord[]> => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const createAdminUser = async (payload: AdminCreateUserPayload): Promise<AdminUserRecord> => {
  const response = await api.post('/admin/users', payload);
  return response.data;
};

export const updateAdminUser = async (
  id: number,
  payload: AdminUpdateUserPayload,
): Promise<AdminUserRecord> => {
  const response = await api.put(`/admin/users/${id}`, payload);
  return response.data;
};

export const setAdminUserPassword = async (id: number, newPassword: string): Promise<void> => {
  await api.put(`/admin/users/${id}/password`, { newPassword });
};

export const deleteAdminUser = async (id: number): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};

export const getAdminTrips = async (userId?: number): Promise<Trip[]> => {
  const response = await api.get('/admin/trips', {
    params: userId ? { userId } : undefined,
  });
  return response.data;
};

export interface AiLogsQuery {
  userId?: number;
  feature?: string;
  operation?: string;
  sessionId?: number;
  tripId?: number;
  limit?: number;
  offset?: number;
}

export const getAdminAiLogs = async (query: AiLogsQuery = {}): Promise<{
  logs: AiInteractionLogSummary[];
  total: number;
  limit: number;
  offset: number;
}> => {
  const response = await api.get('/admin/ai-logs', { params: query });
  return response.data;
};

export const getAdminAiLogDetail = async (id: number): Promise<AiInteractionLogDetail> => {
  const response = await api.get(`/admin/ai-logs/${id}`);
  return response.data;
};
