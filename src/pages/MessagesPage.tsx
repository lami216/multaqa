import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchConversations, type ConversationSummary } from '../lib/http';
import { useConversations } from '../context/ConversationsContext';

const POLL_INTERVAL = 20000;

const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { syncUnreadCounts } = useConversations();

  const handleLoad = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const { data } = await fetchConversations();
        setConversations(data.conversations);
        syncUnreadCounts(data.conversations);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [syncUnreadCounts]
  );

  useEffect(() => {
    void handleLoad(true);
  }, [handleLoad]);

  useEffect(() => {
    const interval = setInterval(() => {
      void handleLoad();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [handleLoad]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await handleLoad();
    } finally {
      setRefreshing(false);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (!conversations.length) return 'Aucune conversation pour le moment';
    return `${conversations.length} conversation(s)`;
  }, [conversations.length]);

  return (
    <div className="card-surface p-4 space-y-4 min-h-[60vh]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{headerSubtitle}</p>
          <h2 className="section-title">Conversations</h2>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin me-1' : 'me-1'} />
          Actualiser
        </button>
      </div>
      <div className="space-y-2">
        {loading && <p className="text-sm text-slate-500">Chargement des conversations...</p>}
        {!loading && !conversations.length && (
          <p className="text-sm text-slate-500">Aucun échange pour le moment.</p>
        )}
        {conversations.map((conversation) => (
          <button
            key={conversation._id}
            type="button"
            onClick={() => navigate(`/messages/${conversation._id}`)}
            className="w-full text-start card-surface p-4 hover:shadow transition"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">
                {conversation.otherParticipant?.username ?? 'Contact'}
              </p>
              {conversation.unreadCount > 0 && (
                <span className="badge-soft bg-emerald-50 text-emerald-700">
                  {conversation.unreadCount} non lu(s)
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 line-clamp-1">
              {conversation.lastMessage?.text ?? 'Nouvelle conversation'}
            </p>
            <p className="text-xs text-slate-400">
              {conversation.lastMessage?.createdAt
                ? new Date(conversation.lastMessage.createdAt).toLocaleString()
                : 'Aucun message'}
            </p>
          </button>
        ))}
      </div>
      <div className="text-sm text-slate-500 flex items-center gap-2">
        <MessageCircle className="text-emerald-600" size={18} />
        Discussions sécurisées et accessibles sur mobile.
      </div>
    </div>
  );
};

export default MessagesPage;
