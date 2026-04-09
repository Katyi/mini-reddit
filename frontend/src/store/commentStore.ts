import { create } from 'zustand';
import api from '../api/axios';

interface CommentState {
  comments: Comment[];
  isLoading: boolean;
  fetchComments: (postId: string) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set) => ({
  comments: [],
  isLoading: false,
  fetchComments: async (postId) => {
    set({ isLoading: true });
    try {
      // const res = await fetch(`http://localhost:9091/posts/${postId}/comments`);
      const res = await api.get(
        `http://localhost:9091/posts/${postId}/comments`,
      );
      // const data = await res.json();
      const data = res.data;
      set({ comments: data || [], isLoading: false });
    } catch {
      set({ comments: [], isLoading: false });
    }
  },
}));
