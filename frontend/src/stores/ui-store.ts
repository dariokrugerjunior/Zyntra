import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ToastMessage } from '../types';

interface UiState {
  darkMode: boolean;
  toasts: ToastMessage[];
  sidebarCollapsed: boolean;
  toggleDarkMode: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      darkMode: true,
      toasts: [],
      sidebarCollapsed: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      addToast: (type, message) => {
        const id = uuidv4();
        set((state) => ({
          toasts: [...state.toasts, { id, type, message }],
        }));
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }, 5000);
      },
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ darkMode: state.darkMode }),
    }
  )
);
