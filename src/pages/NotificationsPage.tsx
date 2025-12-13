import React, { useEffect, useState } from 'react';
import { Bell, Check, MessageCircle, UserPlus } from 'lucide-react';
import apiClient, { type NotificationItem } from '../lib/apiClient';

const iconMap = {
  match: UserPlus,
  message: MessageCircle,
  request: Check,
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    apiClient.getNotifications().then(setNotifications);
  }, []);

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="text-emerald-600" />
        <h1 className="section-title">Notifications</h1>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = iconMap[notification.type as keyof typeof iconMap];
          return (
            <div key={notification.id} className="card-surface p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Icon size={18} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{notification.title}</p>
                <p className="text-sm text-slate-600">{notification.description}</p>
                <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
              </div>
            </div>
          );
        })}
        {!notifications.length && <div className="text-sm text-slate-500">Aucune notification pour le moment.</div>}
      </div>
    </div>
  );
};

export default NotificationsPage;
