import { create } from 'zustand';
import api from '../api/axios';
import axios from 'axios';

interface UserState {
  profile: User | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (username: string) => Promise<void>;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async (username: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/users/profile/${username}`);
      set({ profile: response.data, isLoading: false });
    } catch (err) {
      let serverMessage = 'User not found';
      if (axios.isAxiosError(err)) {
        serverMessage = err.response?.data || serverMessage;
      } else if (err instanceof Error) {
        serverMessage = err.message;
      }
      set({
        profile: null,
        error: serverMessage || 'User not found',
        isLoading: false,
      });
    }
  },

  clearProfile: () => set({ profile: null, error: null }),
}));
