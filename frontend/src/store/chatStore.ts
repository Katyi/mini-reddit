import { create } from 'zustand';
import api from '../api/axios';
import { useSocketStore } from './socketStore';
import { AI_BOT_ID } from '../constants/aiBotID';

interface ChatState {
  messages: Message[];
  isWidgetOpen: boolean;
  activeChatUser: string | null;
  users: User[]; // Список людей, с которыми есть чаты
  activeChatUserData: User | null;

  fetchUsers: () => Promise<void>;
  openWidget: (userId?: string, userData?: User) => void;
  closeWidget: () => void;
  sendMessage: (receiverId: string, content: string) => void;
  fetchHistory: (userId: string) => Promise<void>;
  addMessage: (msg: Message) => void;
  markAsRead: (userId: string) => Promise<void>;
  getTotalUnreadCount: () => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isWidgetOpen: false,
  activeChatUser: null,
  users: [],
  activeChatUserData: null,

  fetchUsers: async () => {
    try {
      const res = await api.get('/chat/active-users');
      set({ users: res.data || [] });
    } catch (error) {
      console.error('Failed to fetch active chats:', error);
      set({ users: [] });
    }
  },

  markAsRead: async (userId: string) => {
    try {
      await api.post(`/chat/read/${userId}`);

      // Локально обнуляем счетчик в списке пользователей,
      // чтобы интерфейс обновился мгновенно
      set((state) => ({
        users: state.users.map((u) =>
          u.id === userId ? { ...u, unread_count: 0 } : u,
        ),
      }));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  },

  openWidget: (userId, userData) => {
    set((state) => {
      const newState: Partial<ChatState> = {
        isWidgetOpen: true,
        activeChatUser: userId || null,
        activeChatUserData: userData || null,
        messages: [],
      };

      // Если данные юзера переданы и его нет в общем списке - добавляем в начало
      if (userData && !state.users.some((u) => u.id === userData.id)) {
        newState.users = [userData, ...state.users];
      }

      return newState;
    });

    if (userId) {
      get().fetchHistory(userId);
      get().markAsRead(userId);
    }
  },

  closeWidget: () => set({ isWidgetOpen: false, activeChatUser: null }),

  fetchHistory: async (userId) => {
    const res = await api.get(`/chat/history/${userId}`);
    set({ messages: res.data || [] });
  },

  sendMessage: (receiverId, content) => {
    const socket = useSocketStore.getState().socket; // Берем сокет из нового стора
    if (socket && socket.readyState === WebSocket.OPEN) {
      const msg = { receiver_id: receiverId, content };
      socket.send(JSON.stringify(msg));
    }
  },

  addMessage: (msg) => {
    set((state) => {
      // 1. Добавляем новое сообщение в список сообщений (как и было)
      const newMessages = [...state.messages, msg];

      // 2. Обновляем список пользователей, чтобы изменить счетчик unread_count
      const updatedUsers = state.users.map((u) => {
        // Проверяем:
        // - Это сообщение от этого пользователя (u.id === msg.sender_id)
        // - И этот чат сейчас НЕ открыт (u.id !== state.activeChatUser)
        if (u.id === msg.sender_id && u.id !== state.activeChatUser) {
          return {
            ...u,
            unread_count: (u.unread_count || 0) + 1,
          };
        }
        return u;
      });

      return {
        messages: newMessages,
        users: updatedUsers,
      };
    });

    // 3. Твоя существующая логика проверки нового пользователя
    const { users, fetchUsers } = get();
    const isNewUser = !users.some(
      (u) => u.id === msg.sender_id || u.id === msg.receiver_id,
    );

    // Если нам написал кто-то новый, кого нет в списке — обновляем список с сервера
    if (isNewUser && msg.sender_id !== AI_BOT_ID) {
      fetchUsers();
    }
  },

  getTotalUnreadCount: () => {
    return get().users.reduce((sum, user) => sum + (user.unread_count || 0), 0);
  },
}));
