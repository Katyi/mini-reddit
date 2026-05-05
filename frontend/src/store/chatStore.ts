import { create } from 'zustand';
import api from '../api/axios';
import { useSocketStore } from './socketStore';

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
    set((state) => ({
      messages: [...state.messages, msg],
    }));

    const { users, fetchUsers } = get();

    // Проверяем: если сообщение пришло от человека, которого нет в списке слева
    // (и это не мы сами), обновляем список пользователей.
    const isNewUser = !users.some(
      (u) => u.id === msg.sender_id || u.id === msg.receiver_id,
    );

    if (isNewUser) {
      fetchUsers();
    }
  },
}));
