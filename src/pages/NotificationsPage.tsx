import React, { useEffect, useState } from 'react';
import { Bell, Check, MessageCircle } from 'lucide-react';
import { fetchNotifications, type NotificationItem } from '../lib/http';

const iconMap: Record<string, typeof MessageCircle> = {
  new_message: MessageCircle,
  chat_initiated: Check,
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchNotifications();
      setNotifications(data.notifications);
      setUnread(data.unread);
    };

    void load();
  }, []);

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-emerald-600" />
          <h1 className="section-title">Notifications</h1>
        </div>
        <span className="badge-soft">{unread} non lues</span>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = iconMap[notification.type] ?? Bell;
          return (
            <div key={notification._id} className="card-surface p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Icon size={18} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{notification.type.replace('_', ' ')}</p>
                <p className="text-sm text-slate-600">{notification.payload ? JSON.stringify(notification.payload) : 'Mise à jour du système'}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(notification.createdAt).toLocaleString()}</p>
              </div>
              {!notification.read && <span className="badge-soft bg-amber-50 text-amber-700">Non lu</span>}
            </div>
          );
        })}
        {!notifications.length && <div className="text-sm text-slate-500">Aucune notification pour le moment.</div>}
      </div>
    </div>
  );
};

export default NotificationsPage;
