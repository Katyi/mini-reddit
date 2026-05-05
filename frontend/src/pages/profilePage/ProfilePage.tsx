import { Link, useParams } from 'react-router-dom';
import { formatDate } from '../../lib/formatDate';
import { useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { usePostStore } from '../../store/postStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { getRedditAge } from '../../lib/getRedditAge';

const ProfilePage = () => {
  const { username } = useParams();
  const {
    fetchProfile,
    profile,
    isLoading,
    error,
    clearProfile,
    updateAvatar,
  } = useUserStore();
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

  const handleAvatarChange = async () => {
    const randomSeed = Math.random().toString(36).substring(7);
    const newAvatarUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${randomSeed}`;

    try {
      await updateAvatar(newAvatarUrl);
    } catch (err) {
      console.log(err);
      alert('Не удалось обновить аватар');
    }
  };

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
          {/* Avatar and avatar change button */}
          <div className="relative group">
            <img
              src={
                profile?.avatar_url ||
                `https://api.dicebear.com/7.x/shapes/svg?seed=${profile?.username}`
              }
              className="w-24 h-auto rounded-full border-2 border-orange-100 shadow-sm object-cover"
              alt="avatar"
            />

            {profile?.id === user?.id && (
              <button
                onClick={handleAvatarChange}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold"
              >
                Change
              </button>
            )}
          </div>

          {/* Title, message button, karma etc...  */}
          <div className="w-full">
            <div className="flex flex-wrap items-center justify-between">
              <h2 className="text-3xl font-semibold text-orange-600">
                u/{profile.username}
              </h2>

              {/* Message button only for other people's profiles */}
              {profile.id !== user?.id && (
                <button
                  onClick={() => openWidget(profile.id, profile)}
                  className="px-4 py-1 bg-orange-600 text-white rounded-full text-sm font-bold h-fit cursor-pointer"
                >
                  Send Message
                </button>
              )}
            </div>

            <div className="flex gap-4 items-center">
              <p className="text-gray-500 text-sm">
                <span className="font-bold">{profile.karma || 0}</span> karma
              </p>
              <p className="text-gray-500 text-sm">
                <span className="font-bold">
                  {getRedditAge(profile.created_at)}
                </span>{' '}
                Reddit Age
              </p>
              <p className="text-gray-500 text-sm">
                <span className="font-bold">Created at: </span>
                {formatDate(profile.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Profile's posts */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-700 mt-4 px-4">
            {profile.id !== user?.id
              ? `u/${profile.username}'s posts`
              : 'My posts'}
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
