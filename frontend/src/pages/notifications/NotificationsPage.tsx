import { Link } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import { useEffect } from 'react';
import deleteIcon from '../../assets/icons/delete.svg';
import { formatDate } from '../../lib/formatDate';

export const NotificationsPage = () => {
  const { notifications, markAsRead, clearAll } = useNotificationStore();

  // При открытии страницы помечаем ВСЕ полученные уведомления как прочитанные,
  // чтобы очистить общий счетчик на колокольчике, но сохранить историю на экране
  useEffect(() => {
    notifications.forEach((notif) => {
      if (!notif.isRead) {
        markAsRead(notif.id);
      }
    });
  }, [notifications, markAsRead]);

  return (
    <div className="w-full max-w-300 p-6">
      <div className=" w-full p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="hover:bg-gray-200 rounded-full p-1 transition-colors cursor-pointer"
            >
              <img src={deleteIcon} alt="deleteIcon" width={23} height={23} />
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium">
              You don't have any notifications yet
            </p>
            <p className="text-sm mt-1">
              When someone replies to your post, it will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <Link
                key={notif.id}
                to={notif.link} // Сюда из бэкенда приходит готовый "/r/community/id"
                className="block p-4 -mx-4 px-4 transition-colors hover:bg-gray-50 flex flex-col gap-1 bg-white"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">
                    {notif.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {notif.createdAt ? formatDate(notif.createdAt) : ''}
                  </span>
                </div>
                <p className="text-gray-800 text-sm">{notif.body}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
