import { create } from 'zustand';
import api from '../api/axios';

interface CommunityState {
  communities: Community[];
  fetchCommunities: () => Promise<void>;
  createCommunity: (name: string, description: string) => Promise<void>;
  deleteCommunity: (id: string) => Promise<void>;
  updateCommunity: (id: string, description: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  communities: [],
  fetchCommunities: async () => {
    try {
      const res = await api.get('/communities');
      const data = res.data;
      set({ communities: data || [] });
      console.log(data);
    } catch (err) {
      console.error(err);
    }
  },
  createCommunity: async (name, description) => {
    try {
      const res = await api.post('/communities', { name, description });
      set({ communities: [...get().communities, res.data] });
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  deleteCommunity: async (id) => {
    try {
      await api.delete(`/communities/${id}`);
      set((state) => ({
        communities: state.communities.filter((c) => c.id !== id),
      }));
    } catch (err) {
      console.error('Delete error:', err);
      throw err;
    }
  },

  updateCommunity: async (id, description) => {
    try {
      await api.patch(`/communities/${id}`, { description });
      set((state) => ({
        communities: state.communities.map((c) =>
          c.id === id ? { ...c, description } : c,
        ),
      }));
    } catch (err) {
      console.error('Update error:', err);
      throw err;
    }
  },
}));
