import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  isModalOpen: boolean;
  modalType: 'login' | 'register';
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  openModal: (type: 'login' | 'register') => void;
  closeModal: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isModalOpen: false,
      modalType: 'login',
      setAuth: (user, token) => {
        set({ user, token, isModalOpen: false });
        localStorage.setItem('token', token); // Дублируем для перехватчика
      },
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('token');
      },
      openModal: (type) => set({ isModalOpen: true, modalType: type }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);
