import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthMode } from '../types';
import { setAuthHeader, clearAuthHeader } from '../lib/api-client';

interface AuthState {
  isAuthenticated: boolean;
  mode: AuthMode | null;
  credential: string | null;
  login: (mode: AuthMode, credential: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      mode: null,
      credential: null,
      login: (mode: AuthMode, credential: string) => {
        setAuthHeader(mode, credential);
        set({ isAuthenticated: true, mode, credential });
      },
      logout: () => {
        clearAuthHeader();
        set({ isAuthenticated: false, mode: null, credential: null });
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
