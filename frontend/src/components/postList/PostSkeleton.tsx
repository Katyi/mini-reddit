const PostSkeleton = () => {
  return (
    <div className="block bg-white p-4 border border-gray-100 rounded-lg animate-pulse space-y-3">
      {/* Шапка: аватарка и юзернейм */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-gray-200" />
        <div className="w-14 h-3 bg-gray-200 rounded" />
        <div className="w-1 h-1 bg-gray-200 rounded" />
        <div className="w-24 h-2 bg-gray-200 rounded" />
      </div>

      {/* Заголовок поста */}
      <div className="w-2/4 h-5 bg-gray-200 rounded mb-2" />

      {/* Текст поста (несколько строк) */}
      <div className="space-y-2">
        <div className="w-full h-3 bg-gray-200 rounded" />
        <div className="w-full h-3 bg-gray-200 rounded" />
        <div className="w-1/2 h-3 bg-gray-200 rounded" />
      </div>

      {/* Нижняя панелька (Рейтинг / Кнопки) */}
      <div className="pt-2">
        <div className="w-17 h-6 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
};

export default PostSkeleton;
