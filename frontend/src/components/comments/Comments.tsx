import { useEffect, useMemo, useState } from 'react';
import { useCommentStore } from '../../store/commentStore';
import CommentForm from '../commentForm/CommentForm';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import ConfirmModal from '../confirmModal/ConfirmModal';
import ArrowIcon from '../arrowIcon/ArrowIcon';

interface TreeComment extends Comment {
  children?: TreeComment[];
}

const Comments = ({ postId }: { postId: string }) => {
  const { comments, fetchComments, voteComment, isLoading } = useCommentStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (postId) fetchComments(postId);
  }, [postId, fetchComments]);

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
    // const { user } = useAuthStore();

    // const isAuthor = user && String(user.id) === String(comment.author_id);
    const isDeleted = comment.content === '[deleted]'; // Условие, что коммент удален
    // const isAuthor = user?.id === comment.author_id;
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

    return (
      <div
        className={`mt-4 ${depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}`}
      >
        <div className="flex gap-3">
          {/* <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex-shrink-0" /> */}
          {/* Аватарку можно сделать серой для удаленных */}
          <div
            className={`w-8 h-8 rounded-full flex-shrink-0 ${
              isDeleted
                ? 'bg-gray-200'
                : 'bg-gradient-to-br from-orange-400 to-yellow-400'
            }`}
          />

          <div className="flex flex-col w-full">
            <div className="flex items-center gap-2">
              {/* <span className="font-semibold text-sm text-gray-900"> */}
              <span
                className={`text-sm font-semibold ${isDeleted ? 'text-gray-400' : 'text-gray-900'}`}
              >
                u/{comment.author_username}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(comment.created_at).toLocaleDateString()}
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
                {/* <p className="text-gray-800 mt-1 text-sm leading-relaxed"> */}
                <p
                  className={`mt-1 text-sm leading-relaxed ${
                    isDeleted ? 'text-gray-400 italic' : 'text-gray-800'
                  }`}
                >
                  {comment.content}
                </p>

                <div className="flex items-center gap-4 mt-2">
                  {/* vote buttons */}
                  <div className={`flex items-center gap-1 rounded-full w-fit`}>
                    <button
                      onClick={() =>
                        voteComment(comment.post_id, comment.id, 1)
                      }
                      className={`hover:text-[#D93900] hover:bg-gray-300 p-2 rounded-full transition-colors cursor-pointer
                        ${comment.rating > 0 ? 'text-[#D93900]' : 'text-gray-400'}`}
                    >
                      <ArrowIcon
                        className="w-4 h-4"
                        vote={comment.rating}
                        left={true}
                      />
                    </button>

                    <span className="text-base font-bold text-center my-1 text-gray-700">
                      {comment?.rating}
                    </span>

                    <button
                      onClick={() =>
                        voteComment(comment.post_id, comment.id, -1)
                      }
                      className={`hover:text-[#6A5CFF] hover:bg-gray-300 p-2 rounded-full transition-colors cursor-pointer
                        ${comment.rating < 0 ? 'text-[#523eff]' : 'text-gray-400'}`}
                    >
                      <ArrowIcon
                        className="w-4 h-4 rotate-180"
                        vote={comment.rating}
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

  return (
    <div className="mt-8 space-y-6">
      <h3 className="font-bold text-lg border-b pb-2">
        Comments ({comments.length})
      </h3>

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

      {isLoading ? (
        <p className="text-gray-400 animate-pulse">Loading comments...</p>
      ) : (
        <div className="space-y-4">
          {commentTree.map((rootComment) => (
            <CommentNode key={rootComment.id} comment={rootComment} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Comments;
