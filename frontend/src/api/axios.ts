import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: BASE_URL,
});

// Добавляем интерцептор (перехватчик) запросов
api.interceptors.request.use(
  (config) => {
    // Пытаемся достать токен из localStorage
    const token = localStorage.getItem('accessToken');

    // Если токен есть, добавляем его в заголовок Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 2. Перехватчик ответов: ловим 401
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Здесь можно вызвать logout из authStore, если нужно
//       localStorage.removeItem('accessToken');
//       // window.location.href = '/';
//     }
//     return Promise.reject(error);
//   },
// );

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и мы еще не пробовали обновиться (_retry)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          // Пытаемся получить новый токен
          // Важно: используем чистый axios, а не наш api, чтобы не зациклиться
          const res = await axios.post(`${BASE_URL}/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = res.data;

          // Обновляем токены в сторе и локалсторадже
          // Здесь мы можем вызвать метод из стора напрямую
          useAuthStore
            .getState()
            .setAuth(
              useAuthStore.getState().user!,
              access_token,
              refresh_token,
            );

          // Повторяем изначальный запрос с новым токеном
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Если даже рефреш не помог — разлогиниваем
          useAuthStore.getState().logout();
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
