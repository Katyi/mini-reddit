import { create } from 'zustand';
import api from '../api/axios';
import { AI_BOT_ID } from '../constants/aiBotID';

interface Message {
  sender_id: string;
  content: string;
  created_at: string;
}

interface AIChatState {
  isAIOpen: boolean;
  aiMessages: Message[];
  toggleAI: () => void;
  addAIMessage: (msg: Message) => void;
  fetchAIHistory: () => Promise<void>; // Новый метод
}

export const useAIChatStore = create<AIChatState>((set, get) => ({
  isAIOpen: false,
  aiMessages: [],

  // toggleAI: () => set((state) => ({ isAIOpen: !state.isAIOpen })),
  toggleAI: () => {
    const nextState = !get().isAIOpen;
    set({ isAIOpen: nextState });

    // Если чат открывается, сразу грузим историю
    if (nextState) {
      get().fetchAIHistory();
    }
  },

  addAIMessage: (msg) =>
    set((state) => ({ aiMessages: [...state.aiMessages, msg] })),

  fetchAIHistory: async () => {
    try {
      // Используем тот же эндпоинт, что и в обычном чате, но с ID бота
      const res = await api.get(`/chat/history/${AI_BOT_ID}`);
      set({ aiMessages: res.data || [] });
    } catch (error) {
      console.error('Failed to fetch AI history:', error);
    }
  },
}));
