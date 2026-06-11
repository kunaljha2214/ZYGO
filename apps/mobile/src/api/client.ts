import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import { friendlyApiError } from '../utils/apiErrors';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(new Error(friendlyApiError(err)))
);
