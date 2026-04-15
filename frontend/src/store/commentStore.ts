import { create } from 'zustand';
import api from '../api/axios';

interface CommentState {
  comments: Comment[];
  isLoading: boolean;
  fetchComments: (postId: string) => Promise<void>;
  createComment: (
    postId: string,
    content: string,
    parentId?: string | null,
  ) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  voteComment: (
    postId: string,
    commentId: string,
    value: number,
  ) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set) => ({
  comments: [],
  isLoading: false,

  fetchComments: async (postId) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/posts/${postId}/comments`);
      set({ comments: res.data || [], isLoading: false });
    } catch {
      set({ comments: [], isLoading: false });
    }
  },

  createComment: async (postId, content, parentId = null) => {
    try {
      const res = await api.post(`/posts/${postId}/comments`, {
        content,
        parent_id: parentId,
      });
      // Добавляем новый коммент в список, чтобы не перекачивать всё с сервера
      set((state) => ({
        comments: [...state.comments, res.data],
      }));
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  },

  updateComment: async (commentId, content) => {
    try {
      const res = await api.patch(`/comments/${commentId}`, { content });
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId ? { ...c, content: res.data.content } : c,
        ),
      }));
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  },

  deleteComment: async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      // set((state) => ({
      //   comments: state.comments.filter((c) => c.id !== commentId),
      // }));
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId
            ? {
                ...c,
                content: '[deleted]',
                author_username: '[deleted]',
                author_id: '',
              }
            : c,
        ),
      }));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  },

  voteComment: async (postId: string, commentId: string, value: number) => {
    try {
      await api.post(`/comments/${commentId}/vote`, { value });

      const res = await api.get(`/posts/${postId}/comments`);
      const updatedComment = res.data;

      set({
        // comment: state.comment?.id === commentId ? updatedPost : state.comment,
        comments: updatedComment,
      });
    } catch (err) {
      console.error('Voting failed:', err);
      throw err;
    }
  },
}));
