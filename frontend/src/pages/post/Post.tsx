import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePostStore } from '../../store/postStore';
import Comments from '../../components/comments/Comments';

const Post = () => {
  const { id } = useParams();
  const { post, fetchPost } = usePostStore();

  useEffect(() => {
    if (id) fetchPost(id);
  }, [id, fetchPost]);

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
    </div>
  );
};

export default Post;
