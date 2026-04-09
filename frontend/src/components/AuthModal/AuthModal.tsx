import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';
import closeIcon from '../../assets/icons/closeIcon.svg';
import { AxiosError } from 'axios';

const AuthModal = () => {
  const { isModalOpen, modalType, closeModal, setAuth, openModal } =
    useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Только для регистрации
  const [error, setError] = useState('');

  if (!isModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = modalType === 'login' ? '/login' : '/register';
      const payload =
        modalType === 'login'
          ? { email, password }
          : { username, email, password };

      const res = await api.post(endpoint, payload);
      setAuth(res.data.user, res.data.token);
      closeModal();
    } catch (err) {
      const axiosError = err as AxiosError<BackendError>;
      setError(axiosError.response?.data.message || 'Error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl p-8 shadow-xl">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full"
        >
          <img src={closeIcon} alt="close" className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-2">
          {modalType === 'login' ? 'Log In' : 'Sign Up'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          By continuing, you agree to our User Agreement and Privacy Policy.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 min-h-[34vh]">
          {modalType === 'register' && (
            <input
              type="text"
              placeholder="Username"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-orange-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-orange-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-orange-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-red-500 text-xs px-2">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-700 transition-colors"
          >
            {modalType === 'login' ? 'Log In' : 'Continue'}
          </button>
        </form>

        <div className="mt-6 text-sm">
          {modalType === 'login' ? (
            <p>
              New to Reddit?{' '}
              <button
                onClick={() => openModal('register')}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already a redditor?{' '}
              <button
                onClick={() => openModal('login')}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Log In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
