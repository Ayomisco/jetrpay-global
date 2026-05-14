import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token on every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        clearAuth();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newToken = data.accessToken;
        Cookies.set('access_token', newToken, { expires: 1 / 96 }); // 15 min
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuth();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set('access_token', accessToken, { expires: 1 / 96, secure: true, sameSite: 'strict' });
  Cookies.set('refresh_token', refreshToken, { expires: 30, secure: true, sameSite: 'strict' });
}

export function clearAuth() {
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
}

// ── Typed API methods ─────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  signup: (payload: {
    fullName: string; email: string; phone: string; password: string; country?: string;
  }) => {
    const parts = payload.fullName.trim().split(/\s+/);
    const firstName = parts[0] || payload.fullName;
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : firstName;
    return api.post('/auth/signup', {
      firstName,
      lastName,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      ...(payload.country && { country: payload.country }),
    }).then((r) => r.data);
  },

  verifyOtp: (email: string, otp: string) =>
    api.post('/auth/verify-otp', { email, otp }).then((r) => r.data),

  resendOtp: (email: string) =>
    api.post('/auth/resend-otp', { email }).then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data).finally(clearAuth),
};

export const walletApi = {
  list: () => api.get('/wallets').then((r) => r.data),
  get: (id: string) => api.get(`/wallets/${id}`).then((r) => r.data),
  transactions: (id: string, params?: { page?: number; pageSize?: number; type?: string }) =>
    api.get(`/wallets/${id}/transactions`, { params }).then((r) => r.data),
  freeze: (id: string) => api.patch(`/wallets/${id}/freeze`).then((r) => r.data),
  unfreeze: (id: string) => api.patch(`/wallets/${id}/unfreeze`).then((r) => r.data),
};

export const transferApi = {
  p2p: (payload: { senderWalletId: string; recipientEmail?: string; recipientPhone?: string; amount: number; currency: string; description?: string }) =>
    api.post('/transfers/p2p', payload, { headers: { 'Idempotency-Key': crypto.randomUUID() } }).then((r) => r.data),

  bank: (payload: {
    recipientAccountNumber: string;
    recipientBankCode: string;
    recipientAccountName: string;
    amount: number;
    currency: string;
    narration?: string;
  }) => api.post('/transfers/bank', payload, { headers: { 'Idempotency-Key': crypto.randomUUID() } }).then((r) => r.data),
};
