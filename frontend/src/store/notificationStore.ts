import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationItem {
  id: string; // Уникальный ID уведомления на фронте для key и markAsRead
  title: string; // Заголовок (Кто и где написал)
  body: string; // Текст уведомления (Превью комментария)
  link: string; // Ссылка для перехода (/r/community/post_id)
  isRead: boolean; // Статус прочтения
  createdAt: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (
    notification: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>,
  ) => void;
  markAllAsSeen: () => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],

      // Добавление нового уведомления из сокета
      addNotification: (data) =>
        set((state) => ({
          notifications: [
            {
              id: Math.random().toString(36).substring(2, 9),
              ...data,
              isRead: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),

      markAllAsSeen: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            isRead: true,
          })),
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
        })),

      clearAll: () => set({ notifications: [] }),
    }),
    {
      name: 'reddit-notifications',
    },
  ),
);
