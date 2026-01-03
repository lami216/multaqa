import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchConversations, type ConversationSummary } from '../lib/http';
import { useAuth } from './AuthContext';

const POLL_INTERVAL = 20000;

interface ConversationsContextValue {
  unreadCount: number;
  refreshUnreadCounts: () => Promise<void>;
  syncUnreadCounts: (conversations: ConversationSummary[]) => void;
  clearUnreadCount: (count: number) => void;
}

const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

const calculateUnreadCount = (conversations: ConversationSummary[]) =>
  conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0);

export const ConversationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const syncUnreadCounts = useCallback((conversations: ConversationSummary[]) => {
    setUnreadCount(calculateUnreadCount(conversations));
  }, []);

  const refreshUnreadCounts = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const { data } = await fetchConversations();
      syncUnreadCounts(data.conversations);
    } catch {
      // ignore refresh errors
    }
  }, [syncUnreadCounts, user]);

  const clearUnreadCount = useCallback((count: number) => {
    if (count <= 0) return;
    setUnreadCount((prev) => Math.max(0, prev - count));
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    void refreshUnreadCounts();
  }, [refreshUnreadCounts, user]);

  useEffect(() => {
    if (!user) return undefined;
    const interval = setInterval(() => {
      void refreshUnreadCounts();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [refreshUnreadCounts, user]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCounts, syncUnreadCounts, clearUnreadCount }),
    [clearUnreadCount, refreshUnreadCounts, syncUnreadCounts, unreadCount]
  );

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
};

export const useConversations = () => {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error('useConversations must be used within ConversationsProvider');
  return ctx;
};
