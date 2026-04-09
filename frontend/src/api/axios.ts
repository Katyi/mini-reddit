import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:9091', // Проверь порт своего Go-сервера
});

// Добавляем интерцептор (перехватчик) запросов
api.interceptors.request.use(
  (config) => {
    // Пытаемся достать токен из localStorage
    const token = localStorage.getItem('token');

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

// Можно также добавить интерцептор ответов для обработки 401 ошибки (логаут, если токен протух)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Здесь можно вызвать logout из authStore, если нужно
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
