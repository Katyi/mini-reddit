import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePostStore } from '../../store/postStore';
import Comments from '../../components/comments/Comments';
import PostModal from '../../components/postModal/PostModal';
import { useAuthStore } from '../../store/authStore';
import ConfirmModal from '../../components/confirmModal/ConfirmModal';
import toast from 'react-hot-toast';
import ArrowIcon from '../../components/arrowIcon/ArrowIcon';

const Post = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { post, fetchPost, deletePost, votePost, isLoading } = usePostStore();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const isAuthor = useMemo(() => {
    if (!user || !post) return false;
    return String(user.id) === String(post.author_id);
  }, [user?.id, post?.author_id]);

  useEffect(() => {
    if (id) fetchPost(id);
  }, [id, fetchPost]);

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

    navigate('/');
  };

  if (isLoading && !post) return <div>Loading...</div>;
  if (!post) return <div>Post not found</div>;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-300 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        <section className="lg:col-span-8 space-y-4 w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-125">
            <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
              <div className="w-6 h-6 rounded-full bg-gray-200" />
              {/* Author name */}
              <span className="font-bold text-black">
                u/{post?.author_username || 'anonymous'}
              </span>
              <span>•</span>
              {/* Time I should change */}
              <span>2 hours ago</span>
            </div>

            {/* Post title */}
            <h1 className="text-3xl font-bold mb-4">{post?.title}</h1>

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
                ${post.rating < 0 ? 'bg-[#6A5CFF]' : post.rating === 0 ? 'bg-[#E5EBEE]' : 'bg-[#D93900]'}`}
            >
              <button
                onClick={() => votePost(post.id, 1)}
                className={`${post.rating === 0 ? 'hover:text-[#D93900]' : 'hover:text-white'} p-2 rounded-full transition-colors cursor-pointer
                  ${post.rating > 0 ? 'hover:bg-[#ae2c00] text-white' : post.rating < 0 ? 'hover:bg-[#523eff] text-white' : 'hover:bg-gray-200 text-gray-400'}`}
              >
                <ArrowIcon className="w-4 h-4" vote={post.rating} left={true} />
              </button>

              <span
                className={`text-base font-bold text-center my-1 ${post.rating === 0 ? 'text-gray-700' : 'text-white'}`}
              >
                {post?.rating}
              </span>

              <button
                onClick={() => votePost(post.id, -1)}
                className={`${post.rating === 0 ? 'hover:text-[#6A5CFF]' : 'hover:text-white'} p-2 rounded-full transition-colors cursor-pointer
                  ${post.rating > 0 ? 'hover:bg-[#ae2c00] text-white' : post.rating < 0 ? 'hover:bg-[#523eff] text-white' : 'hover:bg-gray-200 text-gray-400'}`}
              >
                <ArrowIcon
                  className="w-4 h-4 rotate-180"
                  vote={post.rating}
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
          }}
        />
      )}
    </div>
  );
};

export default Post;
