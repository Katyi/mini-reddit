import { create } from 'zustand';

interface CommunityState {
  communities: Community[];
  fetchCommunities: () => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  communities: [],
  fetchCommunities: async () => {
    try {
      const res = await fetch('http://localhost:9091/communities');
      const data = await res.json();
      set({ communities: data || [] });
    } catch (err) {
      console.error(err);
    }
  },
}));
