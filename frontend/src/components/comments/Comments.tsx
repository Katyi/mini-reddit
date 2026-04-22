import { useEffect, useMemo, useState } from 'react';
import { useCommentStore } from '../../store/commentStore';
import CommentForm from '../commentForm/CommentForm';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import ConfirmModal from '../confirmModal/ConfirmModal';
import ArrowIcon from '../arrowIcon/ArrowIcon';
import { useDebounce } from '../../hooks/useDebounce';
import Select from '../select/Select';
import { formatDate } from '../../lib/formatDate';
import { Link } from 'react-router-dom';

const sortOptions = [
  { label: 'No sort', value: 'no sort' },
  { label: 'Newest', value: 'new' },
  { label: 'Top Rated', value: 'top' },
];

interface TreeComment extends Comment {
  children?: TreeComment[];
}

const Comments = ({ postId }: { postId: string }) => {
  const {
    comments,
    fetchComments,
    voteComment,
    clearComments,
    isLoading,
    hasMore,
  } = useCommentStore();
  const { user } = useAuthStore();

  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);

  const currentSortLabel =
    sortOptions.find((o) => o.value === sort)?.label || 'Newest';

  useEffect(() => {
    // if (postId) fetchComments(postId);
    setPage(1);
    fetchComments(postId, {
      search: debouncedSearch,
      sort: sort,
      page: 1,
      append: false,
    });
    // return () => clearComments();
  }, [postId, debouncedSearch, fetchComments, sort]);

  useEffect(() => {
    return () => clearComments();
  }, [clearComments]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(postId, {
      search: debouncedSearch,
      sort,
      page: nextPage,
      append: true,
    });
  };

  const commentTree = useMemo(() => {
    const map: { [key: string]: TreeComment } = {};
    const roots: TreeComment[] = [];

    // Создаем карту объектов
    comments.forEach((comment) => {
      map[comment.id] = { ...comment, children: [] };
    });

    // Распределяем по родителям
    comments.forEach((comment) => {
      if (comment.parent_id && map[comment.parent_id]) {
        map[comment.parent_id].children?.push(map[comment.id]);
      } else {
        roots.push(map[comment.id]);
      }
    });

    return roots;
  }, [comments]);

  const CommentNode = ({
    comment,
    depth = 0,
  }: {
    comment: TreeComment;
    depth?: number;
  }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const { deleteComment } = useCommentStore();

    const isDeleted = comment.content === '[deleted]'; // Условие, что коммент удален
    const isAuthor = user?.id === comment.author_id && !isDeleted;

    const handleDelete = async () => {
      // if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment(comment.id);
        toast.success('Comment deleted');
      } catch {
        toast.error('Failed to delete comment');
      }
      // }
    };

    const handleVote = (postId: string, commentIdL: string, value: number) => {
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
      voteComment(postId, commentIdL, value);
    };

    return (
      <div
        className={`mt-4 ${depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}`}
      >
        <div className="flex gap-1">
          {/* Аватарку можно сделать серой для удаленных */}
          {!isDeleted ? (
            <img
              src={`https://api.dicebear.com/7.x/shapes/svg?seed=${comment?.author_username}`}
              className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-orange-100 shadow-sm"
              alt="avatar"
            />
          ) : (
            <div className="w-6 h-6 rounded-full flex-shrink-0 bg-gray-200" />
          )}

          <div className="flex flex-col w-full">
            <div className="flex items-center gap-2">
              <Link
                to={`/u/${comment.author_username}`}
                className={`p-0.5 px-2 text-sm font-semibold ${isDeleted ? 'text-gray-400' : 'text-gray-900 hover:bg-gray-200'}
                  rounded-full`}
              >
                u/{comment.author_username}
              </Link>
              <span>•</span>
              <span className="text-xs text-gray-400">
                {formatDate(comment.created_at)}
              </span>
            </div>

            {isEditing ? (
              <CommentForm
                postId={postId}
                commentId={comment.id}
                initialContent={comment.content}
                isEdit={true}
                onSuccess={() => setIsEditing(false)}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <p
                  className={`mt-1 text-sm leading-relaxed ${
                    isDeleted ? 'text-gray-400 italic' : 'text-gray-800'
                  }`}
                >
                  {comment.content}
                </p>

                {!isDeleted && (
                  <div className="flex items-center gap-4 mt-2">
                    {/* VOTE BUTTONS */}
                    <div
                      className={`flex items-center gap-1 rounded-full w-fit`}
                    >
                      <button
                        onClick={() =>
                          handleVote(comment.post_id, comment.id, 1)
                        }
                        className={`hover:text-[#D93900] hover:bg-gray-300 p-2 rounded-full transition-colors cursor-pointer
                        ${comment.user_vote === 1 ? 'text-[#D93900]' : 'text-gray-400'}`}
                      >
                        <ArrowIcon
                          className="w-4 h-4"
                          vote={comment.user_vote}
                          left={true}
                        />
                      </button>

                      <span className="text-base font-bold text-center my-1 text-gray-700">
                        {comment?.rating}
                      </span>

                      <button
                        onClick={() =>
                          handleVote(comment.post_id, comment.id, -1)
                        }
                        className={`hover:text-[#6A5CFF] hover:bg-gray-300 p-2 rounded-full transition-colors cursor-pointer
                        ${comment.user_vote < 0 ? 'text-[#523eff]' : 'text-gray-400'}`}
                      >
                        <ArrowIcon
                          className="w-4 h-4 rotate-180"
                          vote={comment.user_vote}
                          left={false}
                        />
                      </button>
                    </div>

                    <button
                      onClick={() => setIsReplying(!isReplying)}
                      className="text-xs font-bold text-gray-500 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer"
                    >
                      Reply
                    </button>

                    {isAuthor && (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-xs font-bold text-gray-500 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="text-xs font-bold text-red-400 hover:bg-red-50 px-2 py-1 rounded cursor-pointer"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {isReplying && (
              <div className="mt-2">
                <CommentForm
                  postId={postId}
                  parentId={comment.id}
                  autoFocus={true}
                  onSuccess={() => setIsReplying(false)}
                  onCancel={() => setIsReplying(false)}
                />
              </div>
            )}
          </div>
        </div>

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Comment?"
          message="Are you sure you want to delete your comment? This action cannot be undone."
        />

        {/* Отрисовываем детей этого комментария */}
        {comment.children && comment.children.length > 0 && (
          <div className="space-y-2">
            {comment.children.map((child) => (
              <CommentNode key={child.id} comment={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading && comments.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <h3 className="font-bold text-lg border-b pb-2">
        Comments ({comments.length})
      </h3>

      <div className="flex items-center flex-wrap justify-between gap-2">
        {/* SEARCH */}
        <div className="w-full sm:w-1/2 relative">
          <input
            type="text"
            placeholder="Search comments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 px-3 py-1.5 border border-orange-500 rounded-lg text-sm 
            focus:outline-orange-500 hover:outline hover:outline-orange-500"
          />
          <span className="absolute left-3 top-1.5 text-gray-400">🔍</span>
        </div>

        {/* SORT */}
        <Select
          options={sortOptions}
          selectedLabel={currentSortLabel}
          onChange={(val) => setSort(val)}
          open={isSelectOpen} // добавь useState для этого
          setOpen={setIsSelectOpen}
          className="w-full sm:w-32"
        />
      </div>

      <div className="mb-8">
        {user ? (
          <CommentForm postId={postId} />
        ) : (
          <div className="p-4 border border-dashed border-gray-300 rounded-lg flex items-center justify-between">
            <span className="text-gray-500 text-sm">
              Log in or sign up to leave a comment
            </span>
            <button
              onClick={() => useAuthStore.getState().openModal('login')}
              className="text-blue-600 font-bold text-sm hover:underline"
            >
              Log In
            </button>
          </div>
        )}
      </div>

      {/* {isLoading && comments.length === 0 ? (
        <p className="text-gray-400 animate-pulse">Loading comments...</p>
      ) : ( */}
      <div className="space-y-4">
        {commentTree.map((rootComment) => (
          <CommentNode key={rootComment.id} comment={rootComment} />
        ))}

        {/* {isLoading && (
          <p className="text-gray-400 animate-pulse">Loading comments...</p>
        )} */}

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        )}

        {/* Кнопка подгрузки */}
        {hasMore && !isLoading && (
          <button
            onClick={loadMore}
            disabled={isLoading}
            // className="w-full py-2 text-sm font-bold text-orange-600 hover:bg-orange-50 border border-orange-200 rounded-lg transition-colors cursor-pointer"
            className="w-full mt-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 
                        hover:border-orange-500 hover:text-orange-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            Show More Comments
          </button>
        )}
      </div>
      {/* )} */}
    </div>
  );
};

export default Comments;
