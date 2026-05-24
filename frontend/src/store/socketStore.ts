import { create } from 'zustand';
import { BASE_URL } from '../api/axios';
import { useChatStore } from './chatStore';
import { useUserStore } from './userStore';
import { usePostStore } from './postStore';
import { useAIChatStore } from './aiChatStore';
import { useCommentStore } from './commentStore';
import { AI_BOT_ID } from '../constants/aiBotID';
import { useNotificationStore } from './notificationStore';

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
      const response = JSON.parse(event.data);

      // --- ДИСПЕТЧЕР СОБЫТИЙ ---
      if (response.type === 'notification') {
        const notificationData = response.data;

        if (notificationData) {
          useNotificationStore.getState().addNotification({
            title: notificationData.title || 'New comment',
            body: notificationData.body || '',
            link: notificationData.link || '',
          });
        }
      } else if (response.type === 'KARMA_UPDATE') {
        // Обновляем карму в userStore
        useUserStore.getState().setKarma(response.new_karma);
      } else if (response.type === 'POST_RATING_UPDATE') {
        // Вызываем метод обновления рейтинга в твоем хранилище постов
        usePostStore
          .getState()
          .updatePostRating(response.post_id, response.new_rating);
      } else if (response.type === 'COMMENT_RATING_UPDATE') {
        useCommentStore
          .getState()
          .updateCommentRating(response.comment_id, response.new_rating);
      } else if (
        response.sender_id === AI_BOT_ID ||
        response.receiver_id === AI_BOT_ID
      ) {
        useAIChatStore.getState().addAIMessage(response);
      } else if (response.receiver_id || response.sender_id) {
        // Если есть ID отправителя/получателя — это сообщение чата
        const chatStore = useChatStore.getState();
        chatStore.addMessage(response);

        if (response.sender_id === chatStore.activeChatUser) {
          chatStore.markAsRead(response.sender_id);
        }
      }
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
