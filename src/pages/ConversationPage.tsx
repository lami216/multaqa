import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, ChevronLeft, RefreshCw, SendHorizonal } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  fetchConversationMessages,
  fetchConversations,
  markConversationRead,
  sendConversationMessage,
  type ConversationMessageItem,
  type ConversationSummary
} from '../lib/http';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL = 5000;

const ConversationPage: React.FC = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ConversationMessageItem[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = user?.id ?? '';

  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await fetchConversations();
    const found = data.conversations.find((item) => item._id === conversationId) ?? null;
    setConversation(found);
  }, [conversationId]);

  const fetchInitialMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await fetchConversationMessages(conversationId);
      setMessages(data.messages);
      setNextCursor(data.nextCursor);
      await markConversationRead(conversationId);
    } catch (fetchError) {
      setError('Impossible de charger la conversation.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const mergeMessages = useCallback((current: ConversationMessageItem[], incoming: ConversationMessageItem[]) => {
    const map = new Map(current.map((item) => [item._id, item]));
    incoming.forEach((item) => {
      const existing = map.get(item._id);
      map.set(item._id, { ...existing, ...item });
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, []);

  const pollMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const { data: newData } = await fetchConversationMessages(conversationId, {
        after: nextCursor ?? undefined
      });
      if (newData.messages.length) {
        setMessages((prev) => mergeMessages(prev, newData.messages));
        setNextCursor(newData.nextCursor);
      }
      const { data: latestData } = await fetchConversationMessages(conversationId, { limit: 30 });
      if (latestData.messages.length) {
        setMessages((prev) => mergeMessages(prev, latestData.messages));
        setNextCursor(latestData.nextCursor);
      }
      await markConversationRead(conversationId);
    } catch (pollError) {
      // ignore polling errors
    }
  }, [conversationId, mergeMessages, nextCursor]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    void fetchInitialMessages();
  }, [fetchInitialMessages]);

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(() => {
      void pollMessages();
    }, POLL_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [pollMessages]);

  const handleManualRefresh = async () => {
    if (!conversationId) return;
    setRefreshing(true);
    try {
      await pollMessages();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSend = async () => {
    if (!conversationId || !body.trim() || sending) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ConversationMessageItem = {
      _id: tempId,
      conversationId,
      senderId: currentUserId,
      text: body.trim(),
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null
    };
    setMessages((prev) => [...prev, tempMessage]);
    setBody('');
    try {
      const { data } = await sendConversationMessage(conversationId, tempMessage.text);
      setMessages((prev) => prev.map((item) => (item._id === tempId ? data.message : item)));
      setNextCursor(data.message.createdAt);
    } catch (sendError) {
      setMessages((prev) => prev.map((item) => (item._id === tempId ? { ...item, text: `${item.text} (échec)` } : item)));
      setError('Envoi échoué. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (message: ConversationMessageItem) => {
    if (!conversationId) return;
    setError('');
    const retryText = message.text.replace(' (échec)', '').trim();
    try {
      const { data } = await sendConversationMessage(conversationId, retryText);
      setMessages((prev) => prev.map((item) => (item._id === message._id ? data.message : item)));
      setNextCursor(data.message.createdAt);
    } catch (sendError) {
      setError('Nouvel échec d\'envoi.');
    }
  };

  const conversationTitle = useMemo(() => {
    if (!conversation) return 'Conversation';
    return conversation.otherParticipant?.username ?? 'Contact';
  }, [conversation]);

  const renderTicks = (message: ConversationMessageItem) => {
    if (message.senderId !== currentUserId) return null;
    if (message.readAt) {
      return <CheckCheck size={14} className="text-emerald-200" />;
    }
    if (message.deliveredAt) {
      return <CheckCheck size={14} className="text-emerald-100" />;
    }
    return <Check size={14} className="text-emerald-100" />;
  };

  if (!conversationId) {
    return (
      <div className="card-surface p-5 space-y-3">
        <h1 className="section-title">Conversation introuvable</h1>
        <p className="helper-text">Sélectionnez une conversation depuis la liste.</p>
        <Link to="/messages" className="primary-btn w-fit">Retour</Link>
      </div>
    );
  }

  return (
    <div className="card-surface p-4 space-y-4 min-h-[70vh]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => navigate('/messages')}
          >
            <ChevronLeft size={16} className="me-1" /> Retour
          </button>
          <div>
            <p className="text-sm text-slate-500">Discussion</p>
            <h2 className="text-lg font-semibold text-slate-900">{conversationTitle}</h2>
          </div>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={handleManualRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin me-1' : 'me-1'} />
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement des messages...</p>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            const isFailed = message.text.includes('(échec)');
            return (
              <div
                key={message._id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} text-sm`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                    isOwn ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <p>{message.text}</p>
                  <div className={`flex items-center justify-between gap-2 mt-1 text-[11px] ${isOwn ? 'text-emerald-50' : 'text-slate-500'}`}>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                    {renderTicks(message)}
                  </div>
                  {isOwn && isFailed && (
                    <button
                      type="button"
                      className="text-[11px] underline mt-2"
                      onClick={() => handleRetry(message)}
                    >
                      Réessayer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!messages.length && <p className="text-sm text-slate-500">Aucun message pour le moment.</p>}
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <input
          className="flex-1"
          placeholder="Envoyer un message..."
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <button
          type="button"
          className="primary-btn"
          onClick={handleSend}
          disabled={sending}
        >
          <SendHorizonal size={16} className="me-1" /> Envoyer
        </button>
      </div>
    </div>
  );
};

export default ConversationPage;
