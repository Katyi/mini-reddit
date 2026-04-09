import { create } from 'zustand';
import api from '../api/axios';

interface PostState {
  posts: Post[];
  recentPosts: Post[];
  post: Post | null;
  isLoading: boolean;
  fetchPosts: (communityId?: string) => Promise<void>;
  fetchPost: (id: string) => Promise<void>;
}

export const usePostStore = create<PostState>((set) => ({
  posts: [],
  recentPosts: [],
  post: null,
  isLoading: false,
  fetchPosts: async (communityId) => {
    set({ isLoading: true });
    try {
      // const url = communityId
      //   ? `http://localhost:9091/communities/${communityId}/posts`
      //   : 'http://localhost:9091/posts';
      // const res = await fetch(url);
      const res = communityId
        ? await api.get(`/communities/${communityId}/posts`)
        : await api.get('/posts');
      // const data = await res.json();
      const data = res.data;
      set({
        posts: data || [],
        isLoading: false,
        recentPosts: data.slice(0, 5),
      });
    } catch {
      set({ posts: [], recentPosts: [], isLoading: false });
    }
  },
  fetchPost: async (id) => {
    set({ isLoading: true });
    try {
      const url = `/posts/${id}`;
      // const res = await fetch(url);
      const res = await api.get(url);
      // const data = await res.json();
      const data = res.data;
      set({
        post: data || null,
        isLoading: false,
      });
    } catch {
      set({ posts: [], isLoading: false });
    }
  },
}));
