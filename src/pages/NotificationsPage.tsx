import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Check, MessageCircle } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem
} from '../lib/http';
import { useNotifications } from '../context/NotificationsContext';
import { useSmartPolling } from '../hooks/useSmartPolling';

const iconMap: Record<string, typeof MessageCircle> = {
  new_message: MessageCircle,
  chat_initiated: Check,
  join_request_received: Bell,
  join_request_accepted: Check,
  join_request_rejected: Bell
};

const notificationMessageMap: Record<string, string> = {
  join_request_received: 'You received a join request.',
  join_request_accepted: 'Your join request has been accepted.',
  join_request_rejected: 'Your join request has been rejected.',
  new_message: 'You received a new message.',
  chat_initiated: 'You received a new message.'
};

const getNotificationMessage = (notification: NotificationItem) => {
  if (typeof notification.payload?.message === 'string') return notification.payload.message;
  return notificationMessageMap[notification.type] ?? 'You have a new notification.';
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loadingReadId, setLoadingReadId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const { refreshUnreadCount } = useNotifications();

  const load = async () => {
    const { data } = await fetchNotifications();
    setNotifications(data.notifications);
    setUnread(data.unread);
  };

  useEffect(() => {
    void load();
  }, []);

  useSmartPolling({ interval: 5000, fetchFn: load, enabled: true });

  const unreadIds = useMemo(
    () => new Set(notifications.filter((item) => !item.read).map((item) => item._id)),
    [notifications]
  );

  const applyMarkReadLocally = (id: string) => {
    if (!unreadIds.has(id)) return;
    setNotifications((prev) => prev.map((item) => (
      item._id === id ? { ...item, read: true, readAt: new Date().toISOString() } : item
    )));
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (notification.read || loadingReadId) return;
    setLoadingReadId(notification._id);
    applyMarkReadLocally(notification._id);
    try {
      await markNotificationRead(notification._id);
      await refreshUnreadCount();
    } catch {
      setNotifications((prev) => prev.map((item) => (
        item._id === notification._id ? { ...item, read: false, readAt: null } : item
      )));
      setUnread((prev) => prev + 1);
    } finally {
      setLoadingReadId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!unread) return;
    setMarkingAll(true);
    const now = new Date().toISOString();
    const previous = notifications;
    setNotifications((prev) => prev.map((item) => (item.read ? item : { ...item, read: true, readAt: now })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
      await refreshUnreadCount();
    } catch {
      setNotifications(previous);
      setUnread(previous.filter((item) => !item.read).length);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-emerald-600" />
          <h1 className="section-title">Notifications</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="secondary-btn" onClick={handleMarkAllRead} disabled={!unread || markingAll}>
            Mark all as read
          </button>
          <span className="badge-soft">{unread} non lues</span>
        </div>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = iconMap[notification.type] ?? Bell;
          return (
            <div
              key={notification._id}
              className={`card-surface p-4 flex items-start gap-3 transition-opacity ${notification.read ? 'opacity-80' : 'bg-amber-50/60'}`}
            >
              <button
                type="button"
                className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"
                onClick={() => handleNotificationClick(notification)}
              >
                <Icon size={18} />
              </button>
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => handleNotificationClick(notification)}
              >
                <p className="font-semibold text-slate-900">Notification</p>
                <p className="text-sm text-slate-600">{getNotificationMessage(notification)}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(notification.createdAt).toLocaleString()}</p>
              </button>
              {!notification.read ? (
                <button
                  type="button"
                  className="badge-soft bg-amber-50 text-amber-700"
                  onClick={() => handleNotificationClick(notification)}
                  disabled={loadingReadId === notification._id}
                >
                  Mark as read
                </button>
              ) : null}
            </div>
          );
        })}
        {!notifications.length && <div className="text-sm text-slate-500">Aucune notification pour le moment.</div>}
      </div>
    </div>
  );
};

export default NotificationsPage;
