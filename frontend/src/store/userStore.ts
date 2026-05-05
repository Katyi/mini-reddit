import { create } from 'zustand';
import api from '../api/axios';
import axios from 'axios';

interface UserState {
  profile: User | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (username: string) => Promise<void>;
  updateAvatar: (url: string) => Promise<void>;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
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

  updateAvatar: async (url: string) => {
    try {
      await api.patch('/users/avatar', { avatar_url: url });
      const currentProfile = get().profile;
      if (currentProfile) {
        set({ profile: { ...currentProfile, avatar_url: url } });
      }
    } catch (err) {
      console.error('Failed to update avatar', err);
      throw err;
    }
  },

  clearProfile: () => set({ profile: null, error: null }),
}));
