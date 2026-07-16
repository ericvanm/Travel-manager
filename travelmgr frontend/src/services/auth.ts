import axios from 'axios';
import { LoginCredentials, RegisterData, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export class PasswordSetupRequiredError extends Error {
  username: string;

  id: number;

  constructor(username: string, id: number) {
    super('password_setup_required');
    this.username = username;
    this.id = id;
  }
}

export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    if (
      axios.isAxiosError(error)
      && error.response?.status === 403
      && error.response.data?.error === 'password_setup_required'
    ) {
      throw new PasswordSetupRequiredError(error.response.data.username, error.response.data.id);
    }
    throw error;
  }
};

export const setupInitialPassword = async (username: string, newPassword: string): Promise<User> => {
  const response = await api.post('/auth/setup-initial-password', { username, newPassword });
  return response.data;
};

export const register = async (data: RegisterData): Promise<User> => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  await api.post('/auth/forgot-password', { email });
};

export const resetPassword = async (token: string, newPassword: string): Promise<User> => {
  const response = await api.post('/auth/reset-password', { token, newPassword });
  return response.data;
};

export default api;
