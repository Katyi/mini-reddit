import { create } from 'zustand';
import api from '../api/axios';
import { useAuthStore } from './authStore';

interface PostState {
  posts: Post[];
  recentPosts: Post[];
  post: Post | null;
  isLoading: boolean;
  fetchPosts: (communityId?: string) => Promise<void>;
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

  fetchPosts: async (communityId) => {
    set({ isLoading: true });
    try {
      const res = communityId
        ? await api.get(`/communities/${communityId}/posts`)
        : await api.get('/posts');
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

  votePost: async (postId, value) => {
    const state = get();
    const currentPosts = state.posts;
    const oldPost = currentPosts.find((p) => p.id === postId) || state.post;

    if (!oldPost) return;

    // Сохраняем старое состояние на случай ошибки
    const previousPosts = [...state.posts];
    const previousCurrentPost = state.post ? { ...state.post } : null;

    try {
      // 1. Вместо того чтобы просто плюсовать, мы можем сделать
      // "мини-проверку" прямо здесь, если бы у нас было поле user_vote.
      // Но так как его нет, давай просто доверять бэкенду,
      // НО сделаем это быстро.

      const res = await api.post(`/posts/${postId}/vote`, { value });
      const serverRating = res.data.new_rating;

      // 2. Обновляем состояние ТОЛЬКО после ответа,
      // но так как бэк теперь быстрый, задержки не будет.
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, rating: serverRating } : p,
        ),
        post:
          state.post?.id === postId
            ? { ...state.post, rating: serverRating }
            : state.post,
      }));
    } catch (err) {
      console.error(err);
      // Возвращаем старые данные при ошибке
      set({ posts: previousPosts, post: previousCurrentPost });
    }
  },
}));
