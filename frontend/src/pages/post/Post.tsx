import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePostStore } from '../../store/postStore';
import Comments from '../../components/comments/Comments';
import PostModal from '../../components/postModal/PostModal';
import { useAuthStore } from '../../store/authStore';
import ConfirmModal from '../../components/confirmModal/ConfirmModal';
import toast from 'react-hot-toast';

const Post = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { post, fetchPost, deletePost, isLoading } = usePostStore();
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
              <span className="font-bold text-black">
                u/{post?.author_username || 'anonymous'}
              </span>
              <span>•</span>
              <span>2 hours ago</span>
            </div>

            <h1 className="text-3xl font-bold mb-4">{post?.title}</h1>
            {isAuthor && (
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="text-xs font-bold text-gray-500 hover:underline cursor-pointer"
                >
                  Edit
                </button>
                <button
                  // onClick={onDelete}
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
            {/* <p className="text-sm">{post?.content}</p> */}
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-8">
              {post?.content}
            </div>

            {/* Секция комментариев */}
            {id && <Comments postId={id} />}
          </div>
        </section>
        <aside className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky">
            About something
          </div>
        </aside>
      </div>

      {/* Сама модалка подтверждения */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Post?"
        message="This action cannot be undone. Your post will be permanently removed from this community."
      />

      {post && (
        <PostModal
          // key={post.id}
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
