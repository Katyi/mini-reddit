import React, { useState } from 'react';
import { useCommentStore } from '../../store/commentStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Props {
  postId: string;
  parentId?: string | null;
  initialContent?: string;
  isEdit?: boolean;
  commentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

const CommentForm: React.FC<Props> = ({
  postId,
  parentId = null,
  initialContent,
  isEdit,
  commentId,
  onSuccess,
  onCancel,
  autoFocus = false,
}) => {
  const [content, setContent] = useState(initialContent || '');
  const { createComment, updateComment } = useCommentStore();
  const { user, openModal } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(
    !!parentId || autoFocus || isEdit,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      openModal('login');
      return;
    }

    if (!content.trim()) return;

    try {
      if (isEdit && commentId) {
        await updateComment(commentId, content);
        toast.success('Comment updated');
      } else {
        await createComment(postId, content, parentId);
        toast.success('Comment posted!');
      }
      if (onSuccess) onSuccess();
      setContent('');
      // setIsExpanded(!!parentId);
      // if (onSuccess) onSuccess();
      // toast.success('Comment posted!');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const handleCancel = () => {
    setContent('');
    setIsExpanded(false);
    if (onCancel) onCancel();
  };

  if (!isExpanded) {
    return (
      <div className="mt-4">
        <input
          type="text"
          readOnly
          onClick={() => setIsExpanded(true)}
          placeholder="Add a comment"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-500 transition-colors text-sm text-gray-500"
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 animate-in fade-in duration-200"
    >
      <textarea
        autoFocus={autoFocus}
        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none resize-none min-h-[100px] text-sm"
        placeholder={
          parentId
            ? 'What are your thoughts?'
            : 'Comment as ' + (user?.username || 'guest')
        }
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-1.5 text-sm font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-full cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!content.trim()}
          className="px-4 py-1.5 text-sm font-bold bg-orange-600 text-white rounded-full hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {parentId ? 'Reply' : 'Comment'}
        </button>
      </div>
    </form>
  );
};

export default CommentForm;
