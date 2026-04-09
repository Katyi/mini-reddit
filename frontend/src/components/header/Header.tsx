import { Link } from 'react-router-dom';
import burger from '../../assets/icons/burger.svg'; // Импортируем бургер сюда

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header = ({ isSidebarOpen, toggleSidebar }: HeaderProps) => {
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

      <div>
        <button className="bg-[#FF4500] text-white font-light py-1 px-3 rounded-2xl cursor-pointer">
          Log In
        </button>
      </div>
    </header>
  );
};

export default Header;
