import { create } from 'zustand';
import { BASE_URL } from '../api/axios';
import { useChatStore } from './chatStore';
import { useUserStore } from './userStore';
// import { usePostStore } from './postStore'; // если понадобится позже

const WS_URL = BASE_URL.replace(/^http/, 'ws');

interface SocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token) => {
    if (get().socket) return;

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    ws.onopen = () => {
      console.log('Connected to WebSocket Gateway');
      set({ isConnected: true });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // --- ДИСПЕТЧЕР СОБЫТИЙ ---
      if (data.type === 'KARMA_UPDATE') {
        // Обновляем карму в userStore
        useUserStore.getState().setKarma(data.new_karma);
      } else if (data.receiver_id || data.sender_id) {
        // Если есть ID отправителя/получателя — это сообщение чата
        useChatStore.getState().addMessage(data);
      }
      // Здесь можно добавлять новые типы: например, уведомления о новых постах
    };

    ws.onclose = () => {
      set({ isConnected: false, socket: null });
      // Реконнект через 3 секунды
      setTimeout(() => {
        const currentToken = token;
        if (currentToken) get().connect(currentToken);
      }, 3000);
    };

    set({ socket: ws });
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null, isConnected: false });
  },
}));
