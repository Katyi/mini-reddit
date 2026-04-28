import { create } from 'zustand';
import api, { BASE_URL } from '../api/axios';

const WS_URL = BASE_URL.replace(/^http/, 'ws');

interface ChatState {
  messages: Message[];
  socket: WebSocket | null;
  isConnected: boolean;
  isWidgetOpen: boolean;
  activeChatUser: string | null;
  users: User[]; // Список людей, с которыми есть чаты
  activeChatUserData: User | null;

  fetchUsers: () => Promise<void>;
  openWidget: (userId?: string, userData?: User) => void;
  closeWidget: () => void;
  connect: (token: string) => void;
  disconnect: () => void;
  sendMessage: (receiverId: string, content: string) => void;
  fetchHistory: (userId: string) => Promise<void>;
  addMessage: (msg: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  socket: null,
  isConnected: false,
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

  connect: (token) => {
    if (get().socket) return;

    // const ws = new WebSocket(`ws://localhost:8080/ws?token=${token}`);
    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    ws.onopen = () => {
      console.log('Connected to WS');
      set({ isConnected: true });
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      get().addMessage(msg);
    };

    ws.onclose = () => {
      set({ isConnected: false, socket: null });

      const currentToken = token; // Замыкаем токен
      if (currentToken) {
        setTimeout(() => {
          get().connect(currentToken);
        }, 3000);
      }
    };

    set({ socket: ws });
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null, isConnected: false });
  },

  fetchHistory: async (userId) => {
    const res = await api.get(`/chat/history/${userId}`);
    set({ messages: res.data || [] });
  },

  sendMessage: (receiverId, content) => {
    const socket = get().socket;
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
