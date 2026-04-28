import { useState } from 'react';
import { usePostStore } from '../../store/postStore';
import { useCommunityStore } from '../../store/communityStore';
import closeIcon from '../../assets/icons/closeIcon.svg';
import toast from 'react-hot-toast';
import { postSchema } from '../../lib/schemas';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../../api/axios';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id: string;
    title: string;
    content?: string;
    community_id: string;
    image_url: string | null;
  };
}

type ValidationErrors = {
  title?: string[];
  content?: string[];
  communityId?: string[];
  server?: string;
};

const PostModal: React.FC<Props> = ({ isOpen, onClose, initialData }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [error, setError] = useState<ValidationErrors>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [communityId, setCommunityId] = useState(
    initialData?.community_id || '',
  );
  const [shouldDeleteExistingImage, setShouldDeleteExistingImage] =
    useState(false);

  const { createPost, updatePost } = usePostStore();
  const { communities } = useCommunityStore();
  const isEditMode = !!initialData;

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Создаем временную ссылку для предпросмотра
      setPreviewUrl(URL.createObjectURL(file));
      setShouldDeleteExistingImage(false);
    }
  };

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
      if (isEditMode && initialData) {
        await updatePost(
          initialData.id,
          result.data.title,
          result.data.content,
          selectedFile || undefined,
          shouldDeleteExistingImage,
        );
        toast.success('Post updated!');
        onClose();
      } else {
        const newPost = await createPost(
          result.data.title,
          result.data.content,
          result.data.communityId,
          selectedFile || undefined,
        );

        toast.success('Post created!');
        onClose();
        setTitle('');
        setContent('');
        setCommunityId('');
        setSelectedFile(null);
        setPreviewUrl(null); // Вот это очистит картинку
        setShouldDeleteExistingImage(false);
        setError({});

        if (newPost && newPost.community_name) {
          navigate(`/r/${newPost.community_name}`);
        } else {
          navigate('/');
        }
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Image (optional)
            </label>

            {/* Сценарий А: Есть старое фото и мы его еще не пометили на удаление */}
            {isEditMode &&
              initialData?.image_url &&
              !shouldDeleteExistingImage &&
              !previewUrl && (
                <div className="relative inline-block mt-2">
                  <img
                    src={`${BASE_URL}${initialData.image_url}`}
                    className="h-24 w-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => setShouldDeleteExistingImage(true)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md"
                    title="Remove current image"
                  >
                    ✕
                  </button>
                </div>
              )}

            {/* Сценарий Б: Юзер выбрал НОВЫЙ файл (превью) */}
            {previewUrl && (
              <div className="relative inline-block mt-2">
                <img
                  src={previewUrl}
                  className="h-24 w-24 object-cover rounded-lg border border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute -top-2 -right-2 bg-gray-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Поле выбора файла показываем, если нет превью и нет старого фото (или оно удалено) */}
            {!previewUrl &&
              (!initialData?.image_url || shouldDeleteExistingImage) && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
              )}
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
