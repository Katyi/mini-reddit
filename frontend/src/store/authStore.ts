import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isModalOpen: boolean;
  modalType: 'login' | 'register';
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  openModal: (type: 'login' | 'register') => void;
  closeModal: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isModalOpen: false,
      modalType: 'login',
      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isModalOpen: false });
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      },
      openModal: (type) => set({ isModalOpen: true, modalType: type }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
