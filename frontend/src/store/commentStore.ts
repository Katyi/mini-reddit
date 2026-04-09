import { create } from 'zustand';

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
      const res = await fetch(`http://localhost:9091/posts/${postId}/comments`);
      const data = await res.json();
      set({ comments: data || [], isLoading: false });
    } catch {
      set({ comments: [], isLoading: false });
    }
  },
}));
