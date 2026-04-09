import { create } from 'zustand';
import api from '../api/axios';

interface CommunityState {
  communities: Community[];
  fetchCommunities: () => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  communities: [],
  fetchCommunities: async () => {
    try {
      // const res = await fetch('http://localhost:9091/communities');
      const res = api.get('http://localhost:9091/communities');
      // const data = await res.json();
      const data = (await res).data;
      set({ communities: data || [] });
    } catch (err) {
      console.error(err);
    }
  },
}));
