import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './header/Header';
import Footer from './footer/Footer';
import Drawer from './drawer/Drawer';
import AuthModal from './AuthModal/AuthModal';
import { useAuthStore } from '../store/authStore';
import ChatWidget from './chat/ChatWidget';
import { useSocketStore } from '../store/socketStore';
import AIChatAssistant from './AIChatAssistant/AIChatAssistant';

const MainLayout = () => {
  // const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const { accessToken } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (accessToken) {
      connect(accessToken);
    }

    return () => {
      // Закрываем сокет при размонтировании лейаута
      disconnect();
    };
  }, [accessToken, connect, disconnect]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Drawer/Sidebar */}
        <Drawer
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 transition-all duration-300">
          <Outlet />
        </main>
      </div>
      <Footer />
      <AuthModal />
      <ChatWidget />
      <AIChatAssistant />
    </div>
  );
};

export default MainLayout;
