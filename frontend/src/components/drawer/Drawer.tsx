import { useEffect, useState } from 'react';
import closeIcon from '../../assets/icons/closeIcon.svg';
import burger from '../../assets/icons/burger.svg';
import addIcon from '../../assets/icons/addIcon.svg';
import { useCommunityStore } from '../../store/communityStore';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import CommunityModal from '../communityModal/CommunityModal';

interface DrawerProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Drawer = ({ isOpen, toggleSidebar }: DrawerProps) => {
  const { communities, fetchCommunities } = useCommunityStore();
  const { user } = useAuthStore();
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);

  useEffect(() => {
    fetchCommunities();
  }, []);

  return (
    <>
      {/* Overlay: только для мобилок (скрыт на md и выше) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-70 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
          /* Мобильный режим: выезжает поверх всего */
          fixed left-0 top-0 h-full z-[80]
          ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full w-0'}
          /* Десктоп режим: встает в поток */
          md:static md:translate-x-0 md:z-10
          ${isOpen ? 'md:w-72 opacity-100' : 'md:w-0 md:opacity-0 md:border-none'}
        `}
      >
        {/* Контент сайдбара виден только если он открыт */}
        <div className={`${!isOpen && 'hidden'} w-72`}>
          <div className="p-4 border-b flex justify-between items-center">
            <span className="font-bold text-[#576F76]">COMMUNITIES</span>
            {/* {user && (
              <button
                onClick={() => setIsCommModalOpen(true)}
                className="p-1 hover:bg-gray-200 rounded-md text-xl leading-none"
              >
                +
              </button>
            )} */}

            <button
              onClick={toggleSidebar}
              className="cursor-pointer p-1 hover:bg-gray-100 rounded"
            >
              <img src={closeIcon} alt="close" width={18} />
            </button>
          </div>
          {user && (
            <button
              onClick={() => setIsCommModalOpen(true)}
              className="mt-2 mx-2 flex items-center gap-1.5 p-3 w-[calc(100%-16px)] h-12 hover:bg-orange-50 rounded-lg cursor-pointer"
            >
              <img src={addIcon} alt="add community" width={24} height={24} />
              <p>Start a community</p>
            </button>
          )}
          <nav className="p-2 overflow-y-auto max-h-[calc(100vh-60px)]">
            {communities.map((c: Community) => (
              <Link
                key={c.id}
                to={`/r/${c.name}`}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    toggleSidebar();
                  }
                }}
                className="block p-3 hover:bg-orange-50 rounded-lg"
              >
                r/{c.name}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Кнопка-поплавок для десктопа (md+), когда сайдбар закрыт */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed left-4 top-18 z-50 p-2 bg-white border border-gray-200 rounded-full shadow-md hidden md:block"
        >
          <img src={burger} alt="open" width={20} />
        </button>
      )}

      <CommunityModal
        isOpen={isCommModalOpen}
        onClose={() => setIsCommModalOpen(false)}
      />
    </>
  );
};

export default Drawer;
