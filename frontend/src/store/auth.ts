import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, clearAuth, setTokens } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName?: string;
  kycStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED';
  country?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requiresOtp?: boolean; email?: string }>;
  completeOtp: (email: string, code: string, purpose?: string) => Promise<void>;
  signup: (payload: { fullName: string; email: string; phone: string; password: string; country?: string }) => Promise<{ email: string }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login(email, password);
          // If OTP is required, return the info without setting auth
          if (data.requiresOtp || !data.accessToken) {
            return { requiresOtp: true, email: data.email || email };
          }
          setTokens(data.accessToken, data.refreshToken);
          set({ user: data.user, isAuthenticated: true });
          return {};
        } finally {
          set({ isLoading: false });
        }
      },

      completeOtp: async (email, code, purpose = 'LOGIN') => {
        set({ isLoading: true });
        try {
          const data = await authApi.verifyOtp(email, code, purpose);
          if (data.accessToken) {
            setTokens(data.accessToken, data.refreshToken);
            set({ user: data.user || data.member, isAuthenticated: true });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      signup: async (payload) => {
        set({ isLoading: true });
        try {
          const data = await authApi.signup(payload);
          return { email: data.email || payload.email };
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try { await authApi.logout(); } catch {}
        clearAuth();
        set({ user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const data = await authApi.me();
          set({ user: data.data || data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'jetrpay-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);
