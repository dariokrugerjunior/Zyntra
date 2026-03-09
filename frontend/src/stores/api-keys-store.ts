import { create } from 'zustand';
import { ApiKey } from '../types';

interface ApiKeysState {
  apiKeys: ApiKey[];
  loading: boolean;
  setApiKeys: (apiKeys: ApiKey[]) => void;
  setLoading: (loading: boolean) => void;
  removeApiKey: (id: string) => void;
}

export const useApiKeysStore = create<ApiKeysState>((set) => ({
  apiKeys: [],
  loading: false,
  setApiKeys: (apiKeys) => set({ apiKeys }),
  setLoading: (loading) => set({ loading }),
  removeApiKey: (id) =>
    set((state) => ({
      apiKeys: state.apiKeys.filter((k) => k.id !== id),
    })),
}));
