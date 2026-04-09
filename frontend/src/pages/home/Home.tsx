import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePostStore } from '../../store/postStore';
import { useCommunityStore } from '../../store/communityStore';

const Home = () => {
  const { communityName } = useParams();
  const { posts, isLoading, fetchPosts, recentPosts } = usePostStore();
  const { communities } = useCommunityStore();
  const currentCommunity = communities.find((c) => c.name === communityName);

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

  return (
    <div className="w-full flex justify-center">
      {/* Контейнер занимает всю ширину, но ограничивает контент для читаемости */}
      <div className="w-full max-w-300 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* Центральная лента: занимает 8 колонок из 12 на больших экранах */}
        <section className="lg:col-span-8 space-y-4 w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-125">
            <h2 className="text-xl font-bold">
              {communityName ? `Community: r/${communityName}` : 'Posts'}
            </h2>
            {currentCommunity && (
              <p className="text-sm text-gray-500 mb-4">
                Owned by:{' '}
                <span className="font-semibold text-orange-600">
                  u/{currentCommunity.owner_username}
                </span>
              </p>
            )}
            {isLoading ? (
              <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Link
                    to={`/r/${communityName}/${post.id}`}
                    key={post.id}
                    className="flex flex-col p-4 border border-gray-100 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    {/* <div className="bg-red-50"> */}
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                    <div className="text-[10px] text-gray-400 mb-1">
                      Posted by{' '}
                      <span className="text-gray-600 font-medium">
                        u/{post.author_username}
                      </span>
                    </div>
                    <p className="text-gray-600 line-clamp-3">{post.content}</p>
                    <div className="mt-2 text-xs text-gray-400">
                      ID: {post.id}
                      {/* </div> */}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                No posts found.
              </div>
            )}
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
    </div>
  );
};

export default Home;
