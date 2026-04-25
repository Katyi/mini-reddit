import { Link, useParams } from 'react-router-dom';
import { formatDate } from '../../lib/formatDate';
import { useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { usePostStore } from '../../store/postStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';

const ProfilePage = () => {
  const { username } = useParams();
  const { fetchProfile, profile, isLoading, error, clearProfile } =
    useUserStore();
  const { user } = useAuthStore();
  const { posts, fetchPosts, resetPosts } = usePostStore();
  const openWidget = useChatStore((state) => state.openWidget);

  useEffect(() => {
    if (username) fetchProfile(username);
    return () => {
      clearProfile();
      resetPosts();
    };
  }, [username, fetchProfile, clearProfile, resetPosts]);

  useEffect(() => {
    if (profile?.id) {
      fetchPosts({ authorId: profile.id });
    }
  }, [profile?.id, fetchPosts]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 h-[calc(100%-48px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100%-48px)] m-6 text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-200">
        User not found!
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="w-full max-w-300 p-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[calc(100vh-48px-80px-48px)]">
        {/* Profile Information */}
        <div className="flex items-center gap-4">
          {/* here will be avatar */}
          <img
            src={`https://api.dicebear.com/7.x/shapes/svg?seed=${profile?.username}`}
            className="w-24 h-24 rounded-full border-2 border-orange-100 shadow-sm"
            alt="avatar"
          />

          <div className="w-full">
            <div className="flex flex-wrap items-center justify-between">
              <h2 className="text-3xl font-semibold text-orange-600">
                u/{profile.username}
              </h2>
              {profile.id !== user?.id && (
                <button
                  onClick={() => openWidget(profile.id, profile)}
                  className="px-4 py-1 bg-orange-600 text-white rounded-full text-sm font-bold h-fit cursor-pointer"
                >
                  Send Message
                </button>
              )}
            </div>
            <p className="text-gray-500">
              <span className="font-bold">Created at:</span>{' '}
              {formatDate(profile.created_at)}
            </p>
          </div>
        </div>
        {/* <ul className="space-y-2 text-gray-700 font-medium ml-6 mt-12">
          <li>{profile?.email}</li>
          <li>0 follovers</li>
          <li>8,234 Karma</li>
          <li>8 y Reddit Age</li>
        </ul> */}

        {/* PROFILE'S POSTS */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-700 mt-4 px-4">
            Posts by u/{profile.username}
          </h3>

          {posts.length > 0 ? (
            <div className="grid gap-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/r/${post.community_name}/${post.id}`}
                  className="block bg-white p-4 border border-gray-100 rounded-lg hover:border-orange-500 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-500">
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{post.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {post.content}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                    <div className="bg-gray-100 px-2 py-1 rounded-full">
                      Rating: {post.rating || 0}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white p-10 text-center text-gray-400">
              This user hasn't posted anything yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
