import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePostStore } from '../../store/postStore';
import Comments from '../../components/comments/Comments';
import PostModal from '../../components/postModal/PostModal';
import { useAuthStore } from '../../store/authStore';
import ConfirmModal from '../../components/confirmModal/ConfirmModal';
import toast from 'react-hot-toast';
import ArrowIcon from '../../components/arrowIcon/ArrowIcon';
import { formatDate } from '../../lib/formatDate';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';

const Post = () => {
  const { id, communityName } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { post, fetchPost, deletePost, votePost, clearCurrentPost, isLoading } =
    usePostStore();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const isAuthor = useMemo(() => {
    if (!user || !post) return false;
    return String(user.id) === String(post.author_id);
  }, [user?.id, post?.author_id]);

  useEffect(() => {
    if (id) fetchPost(id);
  }, [id, fetchPost, user]);

  useEffect(() => {
    return () => clearCurrentPost();
  }, [clearCurrentPost]);

  const handleDelete = async () => {
    if (!post) return;
    await toast.promise(
      deletePost(post.id),
      {
        loading: 'Deleting post...',
        success: 'Post deleted successfully!',
        error: 'Failed to delete post. Please try again.',
      },
      {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
          fontSize: '14px',
        },
        success: {
          duration: 3000,
          icon: '🔥',
        },
      },
    );

    navigate(`/r/${communityName}`);
  };

  const handleVote = (postId: string, value: number) => {
    if (!user) {
      // Если юзер не залогинен
      toast.error('Sign in to vote!', {
        duration: 3000,
        icon: '🔐',
      });
      // Тут можно вызвать открытие модалки логина, если она у тебя есть
      return;
    }

    // Если залогинен — голосуем
    votePost(postId, value);
  };

  if (isLoading || !post)
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px-80px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-300 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        <section className="lg:col-span-8 space-y-4 w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-125">
            <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
              <img
                src={`https://api.dicebear.com/7.x/shapes/svg?seed=${post?.author_username}`}
                className="w-6 h-6 rounded-full border-2 border-orange-100 shadow-sm"
                alt="avatar"
              />
              {/* Author name */}
              <Link
                to={`/u/${post.author_username}`}
                className="font-bold text-black  p-0.5 px-2 rounded-full hover:bg-gray-200"
              >
                u/{post?.author_username || 'anonymous'}
              </Link>
              <span>•</span>
              <span>{formatDate(post.created_at)}</span>
            </div>

            {/* Post title */}
            <h1 className="text-3xl font-bold mb-4">{post?.title}</h1>

            {/* Post Image */}
            {post.image_url && (
              <div className="mb-6 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                <img
                  src={`${BASE_URL}${post.image_url}`}
                  alt={post.title}
                  className="w-full max-h-[600px] object-contain mx-auto"
                  onError={(e) => {
                    // Если картинка не прогрузилась (например, удалена с сервера)
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Edit and delete buttons */}
            {isAuthor && (
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="text-xs font-bold text-gray-500 hover:underline cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}

            {/* VOTE BUTTONS */}
            <div
              className={`flex items-center gap-1 rounded-full border border-gray-200 w-fit
                ${post.user_vote === 1 ? 'bg-[#D93900]' : post.user_vote === -1 ? 'bg-[#6A5CFF]' : 'bg-[#E5EBEE]'}`}
            >
              <button
                onClick={() => handleVote(post.id, 1)}
                className={`${post.user_vote === 0 ? 'hover:text-[#D93900]' : 'hover:text-white'} p-2 rounded-full transition-colors cursor-pointer
                  ${post.user_vote === 1 ? 'hover:bg-[#ae2c00] text-white' : post.user_vote === -1 ? 'hover:bg-[#523eff] text-white' : 'hover:bg-gray-200 text-gray-400'}`}
              >
                <ArrowIcon
                  className="w-4 h-4"
                  vote={post.user_vote}
                  left={true}
                />
              </button>

              <span
                className={`text-base font-bold text-center my-1 ${post.user_vote === 0 ? 'text-gray-600' : 'text-white'}`}
              >
                {post?.rating}
              </span>

              <button
                onClick={() => handleVote(post.id, -1)}
                className={`${post.user_vote === 0 ? 'hover:text-[#6A5CFF]' : 'hover:text-white'} p-2 rounded-full transition-colors cursor-pointer
                  ${post.user_vote === 1 ? 'hover:bg-[#ae2c00] text-white' : post.user_vote === -1 ? 'hover:bg-[#523eff] text-white' : 'hover:bg-gray-200 text-gray-400'}`}
              >
                <ArrowIcon
                  className="w-4 h-4 rotate-180"
                  vote={post.user_vote}
                  left={false}
                />
              </button>
            </div>

            {/* Post content */}
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-8">
              {post?.content}
            </div>

            {/* Секция комментариев */}
            {id && <Comments postId={id} />}
          </div>
        </section>

        {/* I should put something here */}
        <aside className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky">
            About something
          </div>
        </aside>
      </div>

      {/* Модалка подтверждения */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Post?"
        message="This action cannot be undone. Your post will be permanently removed from this community."
      />

      {/* Модалка для создания и редакт-я поста */}
      {post && (
        <PostModal
          key={`${post.id}-${isEditOpen}`}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          initialData={{
            id: post.id,
            title: post.title,
            content: post.content,
            community_id: post.community_id,
            image_url: post.image_url || null,
          }}
        />
      )}
    </div>
  );
};

export default Post;
