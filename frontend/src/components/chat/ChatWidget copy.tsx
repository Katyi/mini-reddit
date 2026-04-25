// src/components/chat/ChatWidget.tsx
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect, useRef } from 'react';

const ChatWidget = () => {
  const {
    users,
    fetchUsers,
    openWidget,
    isWidgetOpen,
    closeWidget,
    activeChatUser,
    messages,
    sendMessage,
    isConnected,
  } = useChatStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Авто-скролл вниз при новых сообщениях
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  useEffect(() => {
    if (isWidgetOpen && !activeChatUser) {
      fetchUsers();
    }
  }, [isWidgetOpen, activeChatUser, fetchUsers]);

  // useEffect(() => {
  //   // Добавляем небольшую задержку, чтобы DOM успел отрисоваться
  //   const timer = setTimeout(() => {
  //     if (scrollRef.current) {
  //       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  //     }
  //   }, 100);
  //   return () => clearTimeout(timer);
  // }, [messages, activeChatUser]);

  if (!isWidgetOpen || !user) return null;

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[450px] bg-white shadow-2xl rounded-xl border border-gray-300 flex flex-col z-[9999]">
      {/* Header окна */}
      <div className="p-3 bg-white border-b flex justify-between items-center">
        {/* Кнопка НАЗАД: видна только если выбран конкретный чат */}
        {activeChatUser && (
          <button
            onClick={() => useChatStore.setState({ activeChatUser: null })}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
            title="Back to list"
          >
            ←
          </button>
        )}
        {/* <span className="font-bold text-sm">
          Chat {isConnected ? '🟢' : '🔴'}
        </span> */}
        <span className="font-bold text-sm">
          {activeChatUser ? 'Direct Chat' : 'Messages'}{' '}
          {isConnected ? '🟢' : '🔴'}
        </span>
        <button
          onClick={closeWidget}
          className="text-gray-500 hover:text-black"
        >
          ✕
        </button>
      </div>

      {/* Тело чата */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-4 space-y-3 bg-blue-100 ${!activeChatUser && 'rounded-xl'}`}
      >
        {activeChatUser ? (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-2 rounded-2xl max-w-[80%] text-sm ${
                  m.sender_id === user.id
                    ? 'bg-[#0079D3] text-white'
                    : 'bg-white text-black'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        ) : (
          // <div className="text-center text-gray-500 mt-10">
          //   Select a user to start chatting
          // </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-gray-600 font-bold text-xs uppercase mb-2">
              Direct Messages
            </h3>
            {users.length > 0 ? (
              users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openWidget(u.id)}
                  className="flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg transition-colors bg-white w-full text-left"
                >
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                    {u.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">u/{u.username}</span>
                </button>
              ))
            ) : (
              <div className="text-center text-gray-500 mt-10 text-sm">
                No active chats found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Поле ввода */}
      {activeChatUser && (
        <div className="p-3 border-t bg-white rounded-b-xl">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              (sendMessage(activeChatUser, text), setText(''))
            }
            placeholder="Message..."
            className="w-full p-2 bg-gray-100 rounded-lg outline-none text-sm focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
