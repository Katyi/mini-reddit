import { Link, useParams } from 'react-router-dom';
import burger from '../../assets/icons/burger.svg';
import addIcon from '../../assets/icons/addIcon.svg';
import chatIcon from '../../assets/icons/chatIcon.svg';
import notificationsIcon from '../../assets/icons/notifications.svg';
import aiIcon from '../../assets/icons/ai.svg';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';
import PostModal from '../postModal/PostModal';
import { usePostStore } from '../../store/postStore';
import { useChatStore } from '../../store/chatStore';
import { useAIChatStore } from '../../store/aiChatStore';
import { useNotificationStore } from '../../store/notificationStore';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header = ({ isSidebarOpen, toggleSidebar }: HeaderProps) => {
  const { id } = useParams();
  const showSearch =
    (location.pathname === '/' || location.pathname.startsWith('/r/')) && !id;
  const { communityName } = useParams();
  const { user, openModal, logout } = useAuthStore();
  const { searchQuery, setSearchQuery } = usePostStore();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const { openWidget, getTotalUnreadCount, fetchUsers } = useChatStore();
  const totalUnread = getTotalUnreadCount();

  const { toggleAI } = useAIChatStore();

  // Подключаем список уведомлений для отображения счетчика непрочитанных
  const { notifications } = useNotificationStore();

  const unreadNotificationsCount = notifications.filter(
    (n) => !n.isRead,
  ).length;

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  return (
    <header className="sticky top-0 z-50 h-full gap-2 lg:gap-0 py-2 px-4 flex flex-wrap justify-between items-center shadow-2xs bg-white">
      <div className="flex items-center gap-4">
        {/* Бургер для мобилок: виден только если сайдбар закрыт и экран < md */}
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg md:hidden cursor-pointer"
          >
            <img src={burger} alt="menu" width={24} />
          </button>
        )}
        <Link to={'/'}>
          <h1 className="font-extrabold text-2xl text-[#FF4500] hidden lg:block">
            MINI-REDDIT
          </h1>
        </Link>
      </div>

      {/* SEARCH INPUT */}
      {showSearch && (
        <div className="w-full sm:max-w-md relative">
          <input
            type="text"
            placeholder={`Search in ${communityName ? 'r/' + communityName : 'all posts'}...`}
            className="w-full pl-10 pr-4 py-1.5 bg-gray-100 border-none rounded-full text-sm 
             focus:ring-1 focus:ring-orange-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-3 top-1.5 text-gray-400">🔍</span>
        </div>
      )}

      {/* RIGHT SIDE WITH CREATE USERNAME LOGOUT LOGIN... */}
      <div className="flex items-center gap-2">
        {user ? (
          <div className="flex flex-wrap items-center gap-0.5">
            {/* Button for AI */}
            <button
              onClick={toggleAI}
              className="p-2 hover:bg-gray-200 rounded-full cursor-pointer"
              title="Ask AI"
            >
              <img src={aiIcon} alt="aiIcon" width={23} height={23} />
            </button>

            {/* Button for chat */}
            <button
              onClick={() => openWidget()}
              className="p-2 hover:bg-gray-200 rounded-full cursor-pointer relative"
              title="Chat"
            >
              <img src={chatIcon} alt="chatIcon" width={23} height={23} />

              {totalUnread > 0 && (
                <span className="absolute top-0.5 -right-0.5 flex items-center justify-center bg-orange-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full border-2 border-white">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </button>

            {/* Button for notifications  */}
            <Link
              to="/notifications"
              className="p-1.5 hover:bg-gray-200 rounded-full cursor-pointer relative flex items-center justify-center"
              title="Notifications"
            >
              <img
                src={notificationsIcon}
                alt="notifications"
                width={24}
                height={24}
              />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-0.5 -right-0.5 flex items-center justify-center bg-orange-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full border-2 border-white">
                  {unreadNotificationsCount > 99
                    ? '99+'
                    : unreadNotificationsCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsPostModalOpen(true)}
              className="px-4 py-1 border-2 border-transparent hover:border-gray-500 hover:bg-gray-200 rounded-full text-sm font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <img src={addIcon} alt="addIcon" width={20} height={20} />
              Create
            </button>

            <Link
              to={`/u/${user.username}`}
              className="px-4 py-0.5 rounded-full hover:bg-gray-200"
            >
              <span className="text-xl font-semibold text-orange-600">
                u/{user.username}
              </span>
            </Link>
            <button
              onClick={logout}
              className="px-4 py-1 border-2 border-orange-600 hover:bg-gray-200 rounded-full text-sm font-bold cursor-pointer"
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => openModal('login')}
              className="w-[calc(100vw-32px)] sm:w-fit px-4 py-2 bg-orange-600 text-white rounded-full font-bold cursor-pointer"
            >
              Log In
            </button>
          </>
        )}
      </div>

      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
      />
    </header>
  );
};

export default Header;
