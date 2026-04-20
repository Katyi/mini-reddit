import { create } from 'zustand';
import api from '../api/axios';

let voteDebounceTimer: ReturnType<typeof setTimeout> | null = null;

interface CommentState {
  comments: Comment[];
  isLoading: boolean;
  hasMore: boolean;

  clearComments: () => void;
  fetchComments: (
    postId: string,
    params?: {
      search?: string;
      sort?: string;
      page?: number;
      append?: boolean;
    },
  ) => Promise<void>;
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

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  isLoading: false,
  hasMore: true,

  // clearComments: () => set({ comments: [], hasMore: true }),
  clearComments: () => set({ comments: [] }),

  fetchComments: async (
    postId,
    { search = '', sort = 'new', page = 1, append = false } = {},
  ) => {
    // if (!append)
    set({ isLoading: true });

    const limit = 50;
    try {
      const res = await api.get(`/posts/${postId}/comments`, {
        params: { search, sort, page, limit },
      });

      const newComments = res.data || [];
      set((state) => ({
        comments: append ? [...state.comments, ...newComments] : newComments,
        hasMore: newComments.length === limit,
        isLoading: false,
      }));
    } catch {
      set({ comments: [], isLoading: false, hasMore: false });
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

  voteComment: async (postId: string, commentId: string, direction: number) => {
    // 1. Мгновенно обновляем UI (Optimistic Update)
    set((state) => {
      const currentComments = [...state.comments];
      const commentIdx = currentComments.findIndex((c) => c.id === commentId);

      if (commentIdx === -1) return state;

      const target = currentComments[commentIdx];
      let newRating = target.rating;
      let newUserVote = target.user_vote;

      if (target.user_vote === direction) {
        // Отмена голоса (повторный клик)
        newRating -= direction;
        newUserVote = 0;
      } else {
        // Новый голос или смена (-1 на 1)
        const diff = target.user_vote === 0 ? direction : direction * 2;
        newRating += diff;
        newUserVote = direction;
      }

      currentComments[commentIdx] = {
        ...target,
        rating: newRating,
        user_vote: newUserVote,
      };

      return { comments: currentComments };
    });

    // 2. Дебаунс запроса на сервер
    if (voteDebounceTimer) clearTimeout(voteDebounceTimer);

    voteDebounceTimer = setTimeout(async () => {
      try {
        // Берем финальное состояние из стора после всех кликов
        const finalComment = get().comments.find((c) => c.id === commentId);
        if (!finalComment) return;

        // Отправляем на бэкенд (теперь он понимает 0, 1, -1)
        await api.post(`/comments/${commentId}/vote`, {
          value: finalComment.user_vote,
        });

        // Опционально: можно не перекачивать все комменты,
        // так как наш UI уже совпадает с тем, что в базе.
      } catch (error) {
        console.error('Failed to sync comment vote:', error);
        // В случае ошибки лучше перекачать данные, чтобы сбросить UI к реальности
        get().fetchComments(postId);
      }
    }, 500);
  },
}));
