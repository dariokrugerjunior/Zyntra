import { create } from 'zustand';
import { Session } from '../types';

interface SessionsState {
  sessions: Session[];
  selectedSession: Session | null;
  loading: boolean;
  setSessions: (sessions: Session[]) => void;
  setSelectedSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
}

export const useSessionsStore = create<SessionsState>((set) => ({
  sessions: [],
  selectedSession: null,
  loading: false,
  setSessions: (sessions) => set({ sessions }),
  setSelectedSession: (session) => set({ selectedSession: session }),
  setLoading: (loading) => set({ loading }),
  updateSession: (id, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      selectedSession:
        state.selectedSession?.id === id
          ? { ...state.selectedSession, ...updates }
          : state.selectedSession,
    })),
}));
