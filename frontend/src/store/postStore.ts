import { create } from 'zustand';
import api from '../api/axios';
import { useAuthStore } from './authStore';

let voteDebounceTimer: ReturnType<typeof setTimeout> | null = null;

interface PostState {
  posts: Post[];
  recentPosts: Post[];
  post: Post | null;
  isLoading: boolean;
  hasMore: boolean;
  searchQuery: string;

  resetPosts: () => void;
  setSearchQuery: (query: string) => void;
  clearCurrentPost: () => void;
  fetchPosts: (params?: {
    communityId?: string;
    search?: string;
    sort?: string;
    page?: number;
    append?: boolean;
  }) => Promise<void>;
  fetchPost: (id: string) => Promise<void>;
  createPost: (
    title: string,
    content: string,
    communityId: string,
  ) => Promise<void>;
  updatePost: (id: string, title: string, content: string) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  votePost: (postId: string, value: number) => Promise<void>;
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  recentPosts: [],
  post: null,
  isLoading: false,
  hasMore: true,
  searchQuery: '',

  resetPosts: () => {
    set({
      posts: [],
      hasMore: true,
      isLoading: false, // опционально
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  clearCurrentPost: () => {
    set({ post: null });
  },

  fetchPosts: async ({
    communityId,
    search = '',
    sort = 'new',
    page = 1,
    append = false,
  } = {}) => {
    set({ isLoading: true });
    try {
      const limit = 50; // LIMIT FOR PAGE
      const baseUrl = communityId
        ? `/communities/${communityId}/posts`
        : '/posts';
      const res = await api.get(baseUrl, {
        params: { search, sort, page, limit },
      });

      const newPosts = res.data || [];
      set((state) => ({
        posts: append ? [...state.posts, ...newPosts] : newPosts,
        // Если пришло меньше limit, значит на бэкенде посты кончились
        hasMore: newPosts.length === limit,
        isLoading: false,
        // Обновляем виджет недавних постов только при первой загрузке
        recentPosts: !append ? newPosts.slice(0, 5) : state.recentPosts,
      }));
    } catch (err) {
      console.log(err);
      set({
        posts: append ? get().posts : [],
        isLoading: false,
        hasMore: false,
      });
    }
  },

  fetchPost: async (id) => {
    if (!get().post) set({ isLoading: true });

    try {
      const url = `/posts/${id}`;
      const res = await api.get(url);
      const data = res.data;
      set({
        post: data || null,
        isLoading: false,
      });
    } catch {
      set({ posts: [], isLoading: false });
    }
  },

  createPost: async (title, content, communityId) => {
    try {
      const res = await api.post('/posts', {
        title,
        content,
        community_id: communityId,
      });

      const newPost = {
        ...res.data,
        author_username: useAuthStore.getState().user?.username || 'me',
      };
      // Можно либо добавить пост в начало списка, либо просто перезапросить список
      set((state) => ({
        posts: [newPost, ...state.posts],
        recentPosts: [newPost, ...state.recentPosts].slice(0, 5),
      }));
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  updatePost: async (id, title, content) => {
    try {
      const res = await api.patch(`/posts/${id}`, { title, content });

      set((state) => {
        // 1. Обновляем пост в общем списке (Home / Community)
        const updatedPosts = state.posts.map((p) =>
          p.id === id ? { ...p, ...res.data } : p,
        );

        // 2. Обновляем текущий открытый пост (Post.tsx)
        let updatedCurrentPost = state.post;
        if (state.post && state.post.id === id) {
          // Крайне важно: сохраняем старые поля (author_id),
          // если бэк их вдруг не прислал
          updatedCurrentPost = { ...state.post, ...res.data };
        }

        return {
          posts: updatedPosts,
          post: updatedCurrentPost,
          // Также обновляем в "Recent Posts" в сайдбаре
          recentPosts: state.recentPosts.map((p) =>
            p.id === id ? { ...p, ...res.data } : p,
          ),
        };
      });
    } catch (err) {
      console.error('Update failed:', err);
      throw err;
    }
  },

  deletePost: async (id) => {
    await api.delete(`/posts/${id}`);
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== id),
      recentPosts: state.recentPosts.filter((p) => p.id !== id),
      post: state.post?.id === id ? null : state.post,
    }));
  },

  votePost: async (postId, direction: number) => {
    // Используем функциональный set, чтобы расчет всегда шел от актуального состояния
    set((state) => {
      const currentPosts = [...state.posts];
      const postIdx = currentPosts.findIndex((p) => p.id === postId);
      const targetPost = postIdx > -1 ? currentPosts[postIdx] : state.post;

      if (!targetPost || targetPost.id !== postId) return state;

      let newRating = targetPost.rating;
      let newUserVote = 0;

      // ЛОГИКА: Считаем изменение на основе того, что УЖЕ в стейте
      if (targetPost.user_vote === direction) {
        // Отмена (кликнули по той же кнопке)
        newRating -= direction;
        newUserVote = 0;
      } else {
        // Новый голос или реверс (с -1 на 1)
        const diff = targetPost.user_vote === 0 ? direction : direction * 2;
        newRating += diff;
        newUserVote = direction;
      }

      // Возвращаем обновленное состояние
      const updatedPost = {
        ...targetPost,
        rating: newRating,
        user_vote: newUserVote,
      };

      return {
        posts:
          postIdx > -1
            ? currentPosts.map((p, i) => (i === postIdx ? updatedPost : p))
            : state.posts,
        post: state.post?.id === postId ? updatedPost : state.post,
      };
    });

    // ДЕБАУНС ЗАПРОСА (отправляем только финальный результат на сервер)
    if (voteDebounceTimer) clearTimeout(voteDebounceTimer);

    voteDebounceTimer = setTimeout(async () => {
      try {
        // Берем то, что получилось в итоге всех кликов
        const finalState =
          get().posts.find((p) => p.id === postId) || get().post;
        if (!finalState) return;

        // Отправляем текущий user_vote (который может быть 0, 1 или -1)
        // ВАЖНО: Твоему бэкенду может понадобиться правка, чтобы он понимал "0" как удаление голоса
        await api.post(`/posts/${postId}/vote`, {
          value: finalState.user_vote,
        });
      } catch (err) {
        console.error('Server sync failed', err);
        // Тут можно вызвать fetchPost(postId) для принудительной синхронизации при ошибке
      }
    }, 500);
  },
}));
