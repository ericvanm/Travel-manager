import api from './auth';
import {
  AdminUserOption,
  AiInteractionLogDetail,
  AiInteractionLogSummary,
  Trip,
} from '../types';

export const getAdminUsers = async (): Promise<AdminUserOption[]> => {
  const response = await api.get('/admin/users');
  return response.data;
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
