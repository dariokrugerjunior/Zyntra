import { create } from 'zustand';
import { MessageSent } from '../types';

interface MessagesState {
  messages: MessageSent[];
  addMessage: (message: MessageSent) => void;
  updateMessageStatus: (id: string, status: MessageSent['status'], error?: string) => void;
}

export const useMessagesStore = create<MessagesState>((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [message, ...state.messages].slice(0, 100),
    })),
  updateMessageStatus: (id, status, error) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, status, error } : m
      ),
    })),
}));
