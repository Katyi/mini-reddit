import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePostStore } from '../../store/postStore';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../lib/formatDate';
import CreateCommunityModal from '../../components/createCommunityModal/CreateCommunityModal';
import PostList from '../../components/postList/PostList';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/confirmModal/ConfirmModal'; // Импортируй свою новую модалку

const Home = () => {
  const navigate = useNavigate();
  const { communityName } = useParams();
  const { isLoading, fetchPosts, recentPosts } = usePostStore();
  const { communities, deleteCommunity } = useCommunityStore();
  const { user } = useAuthStore();
  const currentCommunity = communities.find((c) => c.name === communityName);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [communityToDelete, setCommunityToDelete] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (communityName) {
      // Ждем, пока communities загрузятся (если они еще пустые)
      if (currentCommunity) {
        fetchPosts(currentCommunity.id.toString());
      }
    } else {
      fetchPosts();
    }
  }, [communityName, currentCommunity, fetchPosts]);

  const openDeleteConfirm = (id: string) => {
    setCommunityToDelete(id);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!communityToDelete) return;

    await toast.promise(
      deleteCommunity(communityToDelete),
      {
        loading: 'Deleting community...',
        success: 'Community deleted successfully!',
        error: 'Failed to delete community.',
      },
      {
        position: 'top-center',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      },
    );

    navigate('/');
  };

  return (
    <div className="w-full flex justify-center">
      {/* Контейнер занимает всю ширину, но ограничивает контент для читаемости */}
      <div className="w-full max-w-300 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* Центральная лента: занимает 8 колонок из 12 на больших экранах */}
        <section className="lg:col-span-8 space-y-4 w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-125">
            {/* Шапка сообщества */}
            {currentCommunity && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
                {/* Цветной баннер (заглушка) */}
                <div className="h-20 bg-orange-500 w-full" />

                <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4 -mt-10">
                    {/* "Аватарка" сообщества */}
                    <div className="w-20 h-20 bg-white border-4 border-white rounded-full flex items-center justify-center text-3xl shadow-sm">
                      {currentCommunity.name[0].toUpperCase()}
                    </div>
                    <div className="mt-8">
                      <h1 className="text-2xl font-bold text-gray-900">
                        r/{currentCommunity.name}
                      </h1>
                      <p className="text-sm text-gray-500">
                        Created {formatDate(currentCommunity.created_at)} by u/
                        {currentCommunity.owner_username}
                      </p>
                    </div>
                  </div>

                  {/* Кнопки управления (только для владельца) */}
                  {user?.id === currentCommunity?.owner_id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-4 py-1.5 border border-gray-300 rounded-full text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        // onClick={() => setIsConfirmDeleteOpen(true)}
                        onClick={() => openDeleteConfirm(currentCommunity.id)}
                        className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-sm font-bold hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-4">
                  <p className="text-gray-700 text-sm leading-relaxed max-w-2xl">
                    {currentCommunity.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            )}

            <PostList />
          </div>
        </section>

        {/* Правая панель: занимает 4 колонки, скрывается на маленьких экранах */}
        <aside className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky">
            <h3 className="font-bold mb-3 text-[#576F76] text-xs uppercase tracking-widest">
              Recent Posts
            </h3>

            <div className="space-y-3">
              {recentPosts.map((rp) => (
                <div key={rp.id} className="group cursor-pointer">
                  <p className="text-sm font-medium group-hover:text-orange-500 transition-colors line-clamp-2">
                    {rp.title}
                  </p>
                  <span className="text-[10px] text-gray-400">Just now</span>
                </div>
              ))}
              {recentPosts.length === 0 && !isLoading && (
                <p className="text-xs text-gray-400 italic">History is empty</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {currentCommunity && (
        <CreateCommunityModal
          key={currentCommunity.id}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialData={currentCommunity}
        />
      )}

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Community?"
        message="Are you sure? All posts in this community will be lost forever. This action cannot be undone."
      />
    </div>
  );
};

export default Home;
