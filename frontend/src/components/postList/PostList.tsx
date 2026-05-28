import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePostStore } from '../../store/postStore';
import { useCommunityStore } from '../../store/communityStore';
import { formatDate } from '../../lib/formatDate';
import PostSkeleton from './PostSkeleton';
import toast from 'react-hot-toast';
import { useDebounce } from '../../hooks/useDebounce';

interface PostListProps {
  sort: string;
}

const PostList = ({ sort }: PostListProps) => {
  const { communityName } = useParams();
  const { posts, fetchPosts, resetPosts, isLoading, searchQuery, hasMore } =
    usePostStore();
  const { communities } = useCommunityStore();
  const [page, setPage] = useState<number>(1);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const currentCommunity = communities.find((c) => c.name === communityName);

  useEffect(() => {
    const commId = currentCommunity?.id.toString();
    resetPosts();
    fetchPosts({
      communityId: commId,
      search: debouncedSearch,
      sort,
      page: 1,
      append: false,
    }).then(() => setPage(1));
  }, [
    communityName,
    currentCommunity?.id,
    debouncedSearch,
    sort,
    fetchPosts,
    resetPosts,
  ]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts({
      communityId: currentCommunity?.id.toString(),
      search: debouncedSearch,
      sort,
      page: nextPage,
      append: true,
    });
  };

  if (isLoading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <PostSkeleton key={n} />
        ))}
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
          className="block bg-white p-4 border border-gray-100 rounded-lg hover:border-orange-500 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-500">
            <img
              src={`https://api.dicebear.com/7.x/shapes/svg?seed=${post?.author_username}`}
              className="w-5 h-5 rounded-full border-2 border-orange-100 shadow-sm overflow-hidden"
              alt="avatar"
            />
            <span className="font-bold text-black">
              u/{post.author_username}
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

            {/* BUTTON SHARE */}
            <button
              onClick={(e) => {
                e.preventDefault(); // Чтобы ссылка <Link> не срабатывала
                e.stopPropagation(); // Чтобы событие не шло к родителю

                const postUrl = `${window.location.origin}/r/${post.community_name}/${post.id}`;
                navigator.clipboard.writeText(postUrl);
                toast.success('Link copied');
              }}
              className="flex items-center gap-1 bg-gray-100 hover:bg-orange-100 hover:text-orange-600 px-2 py-1 rounded-full transition-colors cursor-pointer"
            >
              🔗 Share
            </button>
          </div>
        </Link>
      ))}

      {/* PAGINATION BUTTON */}
      {hasMore && !isLoading && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="w-full mt-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 
                        hover:border-orange-500 hover:text-orange-500 transition-all disabled:opacity-50 cursor-pointer"
        >
          Show More
        </button>
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      )}
    </div>
  );
};

export default PostList;
