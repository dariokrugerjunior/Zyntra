import { create } from 'zustand';
import { Webhook } from '../types';

interface WebhooksState {
  webhooks: Webhook[];
  loading: boolean;
  setWebhooks: (webhooks: Webhook[]) => void;
  setLoading: (loading: boolean) => void;
  updateWebhook: (id: string, updates: Partial<Webhook>) => void;
  removeWebhook: (id: string) => void;
}

export const useWebhooksStore = create<WebhooksState>((set) => ({
  webhooks: [],
  loading: false,
  setWebhooks: (webhooks) => set({ webhooks }),
  setLoading: (loading) => set({ loading }),
  updateWebhook: (id, updates) =>
    set((state) => ({
      webhooks: state.webhooks.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    })),
  removeWebhook: (id) =>
    set((state) => ({
      webhooks: state.webhooks.filter((w) => w.id !== id),
    })),
}));
