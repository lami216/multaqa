import { Bell, Check, ExternalLink, MessageCircle, Star } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationsContext';
import { useSmartPolling } from '../hooks/useSmartPolling';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem
} from '../lib/http';

const iconMap: Record<string, typeof MessageCircle> = {
  new_message: MessageCircle,
  chat_initiated: MessageCircle,
  join_request_received: Bell,
  join_request_accepted: Check,
  join_request_rejected: Bell,
  session_end_requested: Check,
  new_rating: Star,
  suitable_post: Bell
};

const getNotificationLink = (notification: NotificationItem) => {
  const link = notification.payload?.link;
  if (typeof link === 'string' && link.startsWith('/')) return link;
  const conversationId = notification.payload?.conversationId;
  if (typeof conversationId === 'string') return `/messages/${conversationId}`;
  const postId = notification.payload?.postId;
  if (typeof postId === 'string') return `/posts/${postId}`;
  const senderId = notification.payload?.senderId;
  if (notification.type === 'new_rating' && typeof senderId === 'string') return `/profile/${senderId}`;
  return '';
};

const NotificationsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loadingReadId, setLoadingReadId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const { refreshUnreadCount } = useNotifications();

  const getNotificationMessage = (notification: NotificationItem) => {
    if (typeof notification.payload?.message === 'string') return notification.payload.message;
    const key = notification.type as keyof typeof t.notifications;
    return typeof t.notifications[key] === 'string' ? t.notifications[key] : t.notifications.fallback;
  };

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
    if (loadingReadId) return;
    const link = getNotificationLink(notification);
    if (!notification.read) {
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
    }
    if (link) navigate(link);
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
    <div className="premium-panel p-5 space-y-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Bell />
          </span>
          <div>
            <h1 className="section-title">{t.notifications.title}</h1>
            <p className="helper-text">{unread} {t.notifications.unread}</p>
          </div>
        </div>
        <button type="button" className="secondary-btn" onClick={handleMarkAllRead} disabled={!unread || markingAll}>
          {t.notifications.markAll}
        </button>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = iconMap[notification.type] ?? Bell;
          const link = getNotificationLink(notification);
          return (
            <div
              key={notification._id}
              className={`rounded-3xl border p-4 transition ${notification.read ? 'border-slate-200 bg-white/80' : 'border-emerald-100 bg-emerald-50/60 shadow-sm'}`}
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 text-start"
                onClick={() => void handleNotificationClick(notification)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{t.notifications.itemTitle}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600">{getNotificationMessage(notification)}</span>
                  <span className="mt-2 block text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</span>
                </span>
                {link ? <ExternalLink size={16} className="mt-1 text-slate-400" /> : null}
              </button>
            </div>
          );
        })}
        {!notifications.length && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            {t.notifications.empty}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
