import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect, useRef } from 'react';
import { formatDate } from '../../lib/formatDate';
import closeIcon from '../../assets/icons/closeIcon.svg';
import { AI_BOT_ID } from '../../constants/aiBotID';

const ChatWidget = () => {
  const {
    users,
    fetchUsers,
    openWidget,
    isWidgetOpen,
    closeWidget,
    activeChatUserData,
    activeChatUser,
    messages,
    sendMessage,
  } = useChatStore();

  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // Для поиска
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isWidgetOpen) fetchUsers();
  }, [isWidgetOpen, fetchUsers]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isWidgetOpen || !user) return null;

  // Фильтруем пользователей по поиску
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
      u.id !== user.id &&
      u.id !== AI_BOT_ID,
  );

  const activeUser = users.find((u) => u.id === activeChatUser);

  return (
    // Увеличиваем ширину до 600px для двух колонок
    <div className="fixed bottom-2 right-6 w-[650px] h-[500px] bg-white shadow-2xl rounded-xl border border-gray-300 flex overflow-hidden z-[9999]">
      {/* ЛЕВАЯ КОЛОНКА: Список пользователей */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-2.5 border-b border-gray-300 bg-white">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-1.5 text-xs bg-gray-100 rounded-lg border-none focus:ring-1 focus:ring-orange-500 outline-none"
          />
        </div>
        <div className="flex flex-col overflow-y-auto items-center gap-1 my-1">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => openWidget(u.id)}
                className={`w-[calc(100%-8px)] flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors border-b border-orange-100 text-left cursor-pointer
                  ${activeChatUser === u.id ? 'bg-orange-50 border-r-2 border-r-orange-500' : ''}`}
              >
                <div className="w-8 h-8 bg-orange-500 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                  {u.username[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">u/{u.username}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs text-gray-400">No active chats yet.</p>
              <p className="text-[10px] text-gray-400 mt-2">
                Visit a user's profile to start a conversation!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА: Окно чата */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header чата */}
        <div className="p-2.5 border-b border-gray-300 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              {activeUser
                ? `u/${activeUser.username}`
                : activeChatUserData
                  ? `u/${activeChatUserData.username}`
                  : 'Select a chat'}
            </span>
          </div>
          <button
            onClick={closeWidget}
            className="p-1 text-gray-400 hover:text-black cursor-pointer rounded-full hover:bg-gray-200"
          >
            <img src={closeIcon} alt="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Сообщения */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-orange-50"
        >
          {activeChatUser ? (
            messages.map((m, i) => {
              const isMine = m.sender_id === user.id;

              // ЛОГИКА ХВОСТИКА:
              // Проверяем, есть ли следующее сообщение
              const nextMessage = messages[i + 1];
              // Хвостик нужен, если:
              // 1. Это самое последнее сообщение в списке
              // 2. ИЛИ следующее сообщение отправлено другим пользователем
              const isLastInGroup =
                !nextMessage || nextMessage.sender_id !== m.sender_id;

              return (
                <div
                  key={i}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-1'}`}
                >
                  <div
                    className={`px-3 py-1.5 max-w-[85%] min-w-20 text-sm shadow-sm flex flex-col relative ${
                      isMine
                        ? `bg-orange-500 text-white ${isLastInGroup ? 'rounded-2xl rounded-br-none message-mine' : 'rounded-2xl'}`
                        : `bg-white text-black ${isLastInGroup ? 'rounded-2xl rounded-bl-none message-other' : 'rounded-2xl'}`
                    }`}
                  >
                    <span className="text-sm leading-3.5 pr-4">
                      {m.content}
                    </span>
                    <span
                      className={`text-[9px] self-end text-right ${isMine ? 'text-orange-100' : 'text-gray-400'}`}
                    >
                      {formatDate(m.created_at).slice(-5)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p className="text-sm">Your messages will appear here</p>
            </div>
          )}
        </div>

        {/* Ввод сообщения */}
        {activeChatUser && (
          <div className="p-3 border-t border-gray-300">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && text.trim()) {
                  sendMessage(activeChatUser, text);
                  setText('');
                }
              }}
              placeholder="Message..."
              className="w-full p-2 bg-gray-100 rounded-lg outline-none text-sm focus:ring-1 focus:ring-orange-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWidget;
