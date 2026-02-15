import React, { createContext, useContext, useMemo, useState } from 'react';
import { fetchNotifications, fetchUnreadNotificationsCount } from '../lib/http';
import { useAuth } from './AuthContext';
import { useSmartPolling } from '../hooks/useSmartPolling';

interface NotificationsContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState<string | undefined>(undefined);

  const refreshUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const { data } = await fetchUnreadNotificationsCount({ after: lastKnownTimestamp });
      if (typeof data.unread === 'number') {
        setUnreadCount(data.unread);
      }
      setLastKnownTimestamp(new Date().toISOString());
    } catch {
      try {
        const { data } = await fetchNotifications();
        setUnreadCount(data.unread ?? 0);
        setLastKnownTimestamp(new Date().toISOString());
      } catch {
        // ignore polling errors
      }
    }
  };

  useSmartPolling({
    interval: 5000,
    fetchFn: refreshUnreadCount,
    enabled: Boolean(user)
  });

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount }),
    [unreadCount]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};
