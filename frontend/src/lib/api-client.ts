import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authHeader: { key: string; value: string } | null = null;

export const setAuthHeader = (mode: 'api-key' | 'company', credential: string) => {
  if (mode === 'api-key') {
    authHeader = { key: 'X-API-Key', value: credential };
  } else {
    authHeader = { key: 'Authorization', value: `Bearer ${credential}` };
  }
};

export const clearAuthHeader = () => {
  authHeader = null;
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (authHeader) {
      config.headers.set(authHeader.key, authHeader.value);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = error.response?.data
      ? (error.response.data as any).message || (error.response.data as any).error || 'Falha na requisicao'
      : error.message || 'Erro de rede';

    return Promise.reject({
      status: error.response?.status,
      message,
      originalError: error,
    });
  }
);
