import { useEffect, useMemo } from 'react';
import { useCommentStore } from '../../store/commentStore';

interface TreeComment extends Comment {
  children?: TreeComment[];
}

const Comments = ({ postId }: { postId: string }) => {
  const { comments, fetchComments, isLoading } = useCommentStore();

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
  }) => (
    <div
      className={`mt-4 ${depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}`}
    >
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex-shrink-0" />
        <div className="flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              u/{comment.author_username}
            </span>
            <span className="text-xs text-gray-400">just now</span>
          </div>
          <p className="text-gray-800 mt-1 text-sm leading-relaxed">
            {comment.content}
          </p>
          <button className="text-xs text-gray-500 mt-2 hover:text-orange-500 font-medium">
            Reply
          </button>
        </div>
      </div>

      {/* Отрисовываем детей этого комментария */}
      {comment.children && comment.children.length > 0 && (
        <div className="mt-2">
          {comment.children.map((child) => (
            <CommentNode key={child.id} comment={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-8 space-y-6">
      <h3 className="font-bold text-lg border-b pb-2">
        Comments ({comments.length})
      </h3>

      {/* {isLoading ? (
        <p className="text-gray-400 animate-pulse">Loading comments...</p>
      ) : (
        <div className="space-y-4">
          {comments?.map((comment: Comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex-shrink-0" />
              <div className="flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    u/{comment?.author_username}
                  </span>
                  <span className="text-xs text-gray-400">12h ago</span>
                </div>
                <p className="text-gray-800 mt-1 text-sm leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )} */}

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
