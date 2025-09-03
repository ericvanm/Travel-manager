import axios from 'axios';
import { LoginCredentials, RegisterData, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const login = async (credentials: LoginCredentials): Promise<User> => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const register = async (data: RegisterData): Promise<User> => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

export default api;