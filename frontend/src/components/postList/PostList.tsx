import { Link } from 'react-router-dom';
import { usePostStore } from '../../store/postStore';
import { formatDate } from '../../lib/formatDate';

const PostList = () => {
  const { posts, isLoading } = usePostStore();

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-200">
        No posts found in this community.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Link
          key={post.id}
          to={`/r/${post.community_name}/${post.id}`}
          className="block bg-white p-4 border border-gray-100 rounded-lg hover:border-orange-500 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-500">
            <img
              src={`https://api.dicebear.com/7.x/shapes/svg?seed=${post?.author_username}`}
              className="w-5 h-5 rounded-full border-2 border-orange-100 shadow-sm overflow-hidden"
              alt="avatar"
            />
            <span
              // to={`/u/${post.author_username}`}
              className="font-bold text-black  p-0.5 px-2 rounded-full hover:bg-gray-200"
            >
              {/* u/{post.author_username} */}
            </span>

            <span>•</span>
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

      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      )}
    </div>
  );
};

export default PostList;
