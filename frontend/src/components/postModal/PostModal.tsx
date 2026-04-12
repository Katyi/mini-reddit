import { useState } from 'react';
import { usePostStore } from '../../store/postStore';
import { useCommunityStore } from '../../store/communityStore';
import closeIcon from '../../assets/icons/closeIcon.svg';
import toast from 'react-hot-toast';
import { postSchema } from '../../lib/schemas';
import axios from 'axios';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id: string;
    title: string;
    content: string;
    community_id: string;
  };
}

type ValidationErrors = {
  title?: string[];
  content?: string[];
  communityId?: string[];
  server?: string;
};

const PostModal: React.FC<Props> = ({ isOpen, onClose, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [error, setError] = useState<ValidationErrors>({});
  const [communityId, setCommunityId] = useState(
    initialData?.community_id || '',
  );

  const { createPost, updatePost } = usePostStore();
  const { communities } = useCommunityStore();
  const isEditMode = !!initialData;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError({});

    const data = { title, content, communityId };
    const result = postSchema.safeParse(data);

    if (!result.success) {
      const validationErrors = result.error.flatten().fieldErrors;
      setError(validationErrors as ValidationErrors);
      return;
    }

    try {
      const action =
        isEditMode && initialData
          ? updatePost(initialData.id, title, content)
          : createPost(title, content, communityId);

      await toast.promise(
        action,
        {
          loading: isEditMode ? 'Saving changes...' : 'Creating post...',
          success: isEditMode ? 'Post updated!' : 'Post created successfully!',
          error: 'Something went wrong. Please try again.',
        },
        {
          position: 'top-center',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        },
      );

      onClose();
      if (!isEditMode) {
        setTitle('');
        setContent('');
        setCommunityId('');
      }
    } catch (err) {
      let serverMessage = 'Something went wrong. Please try again.';
      if (axios.isAxiosError(err)) {
        serverMessage = err.response?.data || serverMessage;
      } else if (err instanceof Error) {
        serverMessage = err.message;
      }
      setError({ server: serverMessage });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {isEditMode ? 'Edit Post' : 'Create a Post'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <img src={closeIcon} alt="close" width={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {!isEditMode && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Community
              </label>
              <select
                // required
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
              >
                <option value="">Select a community</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="h-4 mb-2 pl-2">
                {error.communityId && (
                  <p className="text-red-500 text-xs">{error.communityId[0]}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
              Title
            </label>
            <input
              // required
              className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />
            <div className="h-4 mb-2 pl-2">
              {error.title && (
                <p className="text-red-500 text-xs">{error.title[0]}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
              Content
            </label>
            <textarea
              // required
              className="w-full p-2 border rounded-lg h-40 resize-none outline-none focus:ring-2 focus:ring-orange-500"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Text (optional)"
            />
            <div className="h-4 mb-2 pl-2">
              {error.content && (
                <p className="text-red-500 text-xs">{error.content[0]}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 font-bold text-gray-500 bg-gray-200 hover:bg-gray-300 rounded-full cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-700 transition-colors cursor-pointer"
            >
              {isEditMode ? 'Save' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostModal;
