import { Link } from 'react-router-dom';
import burger from '../../assets/icons/burger.svg'; // Импортируем бургер сюда
import { useAuthStore } from '../../store/authStore';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header = ({ isSidebarOpen, toggleSidebar }: HeaderProps) => {
  const { user, openModal, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 h-14 px-4 flex justify-between items-center shadow-2xs">
      <div className="flex items-center gap-4">
        {/* Бургер для мобилок: виден только если сайдбар закрыт и экран < md */}
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg md:hidden cursor-pointer"
          >
            <img src={burger} alt="menu" width={24} />
          </button>
        )}
        <Link to={'/'}>
          <h1 className="font-extrabold text-2xl text-[#FF4500]">
            MINI-REDDIT
          </h1>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-semibold text-orange-600">
              u/{user.username}
            </span>
            <button
              onClick={logout}
              className="px-4 py-1 border-2 border-orange-600 rounded-full text-sm font-bold"
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => openModal('login')}
              className="px-4 py-2 bg-orange-600 text-white rounded-full font-bold cursor-pointer"
            >
              Log In
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
