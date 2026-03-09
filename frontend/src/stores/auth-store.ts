import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthMode } from '../types';
import { setAuthHeader, clearAuthHeader } from '../lib/api-client';

interface AuthState {
  isAuthenticated: boolean;
  mode: AuthMode | null;
  credential: string | null;
  companyId: string | null;
  companyName: string | null;
  login: (
    mode: AuthMode,
    credential: string,
    companyId?: string | null,
    companyName?: string | null
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      mode: null,
      credential: null,
      companyId: null,
      companyName: null,
      login: (
        mode: AuthMode,
        credential: string,
        companyId?: string | null,
        companyName?: string | null
      ) => {
        setAuthHeader(mode, credential);
        set({
          isAuthenticated: true,
          mode,
          credential,
          companyId: companyId ?? null,
          companyName: companyName ?? null
        });
      },
      logout: () => {
        clearAuthHeader();
        set({ isAuthenticated: false, mode: null, credential: null, companyId: null, companyName: null });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.isAuthenticated && state.mode && state.credential) {
          setAuthHeader(state.mode, state.credential);
        }
      },
    }
  )
);
