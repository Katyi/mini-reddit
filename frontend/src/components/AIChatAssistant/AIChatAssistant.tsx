import { useState, useEffect, useRef } from 'react';
import { useAIChatStore } from '../../store/aiChatStore';
import { useSocketStore } from '../../store/socketStore';
import closeIcon from '../../assets/icons/closeIcon.svg';
import { AI_BOT_ID } from '../../constants/aiBotID';

const AIChatAssistant = () => {
  const { isAIOpen, toggleAI, aiMessages } = useAIChatStore();
  const socket = useSocketStore((state) => state.socket);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null); // Добавляем реф

  // Скролл вниз
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages, isTyping]);

  // Подписываемся на сообщения для индикатора "Thinking"
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      // Если пришло сообщение от ИИ — выключаем индикатор
      if (data.sender_id === AI_BOT_ID) {
        setIsTyping(false);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  // Закрытие по ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAIOpen) toggleAI();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isAIOpen, toggleAI]);

  // Закрытие по клику ВНЕ
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isAIOpen &&
        chatRef.current &&
        !chatRef.current.contains(event.target as Node)
      ) {
        toggleAI();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAIOpen, toggleAI]);

  const sendToAI = () => {
    if (!input.trim() || !socket) return;

    setIsTyping(true); // Включаем "Thinking" при отправке

    const msg = { receiver_id: AI_BOT_ID, content: input };
    socket.send(JSON.stringify(msg));
    setInput('');
  };

  if (!isAIOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col bg-white shadow-2xl border-orange-500 overflow-hidden
       sm:inset-auto sm:bottom-2 sm:right-6 sm:w-96 sm:h-[500px]  sm:rounded-xl sm:border-t-4"
      ref={chatRef}
    >
      <div className="bg-gray-50 p-3 border-b flex justify-between items-center shrink-0">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          🤖 AI Assistant
        </h3>
        <button
          onClick={toggleAI}
          className="cursor-pointer p-2 hover:bg-gray-200 rounded-full"
        >
          <img src={closeIcon} alt="close" className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {aiMessages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-10">
            I’ll help you figure out Mini-Reddit. Feel free to ask anything!
          </p>
        )}
        {aiMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender_id === AI_BOT_ID ? 'justify-start' : 'justify-end'}`}
          >
            {/* <div
              className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.sender_id === AI_BOT_ID ? 'bg-white border' : 'bg-orange-500 text-white'}`}
            > */}
            <div
              className={`p-3 rounded-2xl max-w-[85%] text-sm ${
                msg.sender_id === AI_BOT_ID
                  ? 'bg-white shadow-sm'
                  : 'bg-orange-500 text-white'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="text-xs text-gray-400 animate-pulse flex items-center gap-1">
            <span>🤖</span> AI thinking...
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t flex gap-2 items-center shrink-0">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendToAI()}
          placeholder="Ask AI..."
          className="w-full p-2 bg-gray-100 rounded-lg outline-none text-sm focus:ring-1 focus:ring-orange-500"
        />
        <button
          onClick={sendToAI}
          className="bg-orange-500 text-white w-9 h-9 p-1 flex items-center justify-center rounded-full hover:bg-orange-700 cursor-pointer"
        >
          🚀
        </button>
      </div>
    </div>
  );
};

export default AIChatAssistant;
