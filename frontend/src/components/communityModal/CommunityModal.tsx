import React, { useEffect, useState } from 'react';
import { useCommunityStore } from '../../store/communityStore';
import { communitySchema } from '../../lib/schemas';
import axios from 'axios';
import closeIcon from '../../assets/icons/closeIcon.svg';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id: string;
    name: string;
    description: string;
  };
}

type ValidationErrors = {
  name?: string[];
  description?: string[] | undefined;
  server?: string;
};

const CommunityModal: React.FC<Props> = ({ isOpen, onClose, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(
    initialData?.description || '',
  );
  const [error, setError] = useState<ValidationErrors>({});

  const { createCommunity, updateCommunity } = useCommunityStore();
  const isEditMode = !!initialData;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError({});

    const data = { name, description };
    const result = communitySchema.safeParse(data);

    if (!result.success) {
      const validationErrors = result.error.flatten().fieldErrors;
      setError(validationErrors as ValidationErrors);
      return;
    }

    try {
      if (isEditMode && initialData) {
        await updateCommunity(initialData.id, description);
      } else {
        await createCommunity(name, description);
      }
      onClose();
      if (!isEditMode) {
        setName('');
        setDescription('');
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
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditMode ? `Edit r/${initialData?.name}` : 'Create a Community'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <img src={closeIcon} alt="close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Community Name */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 font-bold">
                r/
              </span>
              <input
                disabled={isEditMode}
                // className="w-full pl-7 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                className={`w-full pl-7 p-2 border rounded-lg outline-none transition-all 
                  ${isEditMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:ring-2 focus:ring-orange-500'}
                  ${error.name ? 'border-red-500' : 'border-gray-200'}`}
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\s/g, ''))} // Убираем пробелы
                placeholder="community_name"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Community names cannot be changed.
            </p>
            <div className="h-4 mb-2 pl-2">
              {error.name && (
                <p className="text-red-500 text-xs">{error.name[0]}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Description
            </label>
            <textarea
              // className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg h-24 resize-none outline-none focus:ring-2 focus:ring-orange-500"
              className={`w-full p-2 bg-gray-50 border rounded-lg h-32 resize-none outline-none transition-all focus:ring-2 focus:ring-orange-500
                ${error.description ? 'border-red-500' : 'border-gray-200'}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your community..."
            />
            <div className="h-4 mb-2 pl-2">
              {error.description && (
                <p className="text-red-500 text-xs">{error.description[0]}</p>
              )}
            </div>
          </div>

          {/* Server Error Message */}
          <div className="min-h-6 mb-4 pl-2">
            {error.server && (
              <div className="text-red-500 text-xs">{error.server}</div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 font-bold bg-gray-100 hover:bg-gray-300 rounded-full cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-700 cursor-pointer"
            >
              {isEditMode ? 'Save Changes' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommunityModal;
