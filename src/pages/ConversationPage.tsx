import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, ChevronLeft, RefreshCw, SendHorizonal } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  fetchConversationMessages,
  fetchConversations,
  fetchMessageStatusChanges,
  markConversationRead,
  sendConversationMessage,
  extendConversation,
  fetchSessionByConversation,
  requestSessionEnd,
  confirmSessionEnd,
  type ConversationMessageItem,
  type ConversationSummary,
  type SessionItem
} from '../lib/http';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../context/ConversationsContext';
import { useSmartPolling } from '../hooks/useSmartPolling';
import RatingModal from '../components/RatingModal';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

const ConversationPage: React.FC = () => {
  const { conversationId } = useParams();
  const { currentUserId } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ConversationMessageItem[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState<string | undefined>(undefined);
  const [lastStatusSync, setLastStatusSync] = useState<string | undefined>(undefined);
  const [sessionData, setSessionData] = useState<SessionItem | null>(null);
  const [openRating, setOpenRating] = useState(false);
  const [dismissedRatingPromptKey, setDismissedRatingPromptKey] = useState<string | null>(null);
  const [openEndSessionModal, setOpenEndSessionModal] = useState(false);
  const [openPendingEndModal, setOpenPendingEndModal] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [now, setNow] = useState(Date.now());
  const { clearUnreadCount } = useConversations();

  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await fetchConversations({ status: 'active' });
    let found = data.conversations.find((item) => item._id === conversationId) ?? null;
    if (!found) {
      const { data: archivedData } = await fetchConversations({ status: 'archived' });
      found = archivedData.conversations.find((item) => item._id === conversationId) ?? null;
    }
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
      const latestMessage = data.messages[data.messages.length - 1];
      setLastKnownTimestamp(latestMessage?.createdAt ?? undefined);
      setLastStatusSync(new Date().toISOString());
      await markConversationRead(conversationId);
      const { data: sessionResult } = await fetchSessionByConversation(conversationId);
      setSessionData(sessionResult.session);
    } catch (fetchError) {
      setError('Impossible de charger la conversation.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);


  const applyStatusChanges = useCallback((changes: Array<{ _id: string; deliveredAt?: string | null; readAt?: string | null }>) => {
    if (!changes.length) return;
    const changeMap = new Map(changes.map((item) => [item._id, item]));
    setMessages((prev) => prev.map((item) => {
      const change = changeMap.get(item._id);
      if (!change) return item;
      return {
        ...item,
        deliveredAt: change.deliveredAt ?? item.deliveredAt ?? null,
        readAt: change.readAt ?? item.readAt ?? null
      };
    }));
  }, []);

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
        after: lastKnownTimestamp
      });
      if (newData.messages.length) {
        setMessages((prev) => mergeMessages(prev, newData.messages));
        const latestMessage = newData.messages[newData.messages.length - 1];
        setLastKnownTimestamp(latestMessage?.createdAt ?? lastKnownTimestamp);
      }
      if (newData.nextCursor) {
        setNextCursor(newData.nextCursor);
      }

      const statusSince = lastStatusSync ?? lastKnownTimestamp;
      const { data: statusData } = await fetchMessageStatusChanges(conversationId, {
        after: statusSince
      });
      applyStatusChanges(statusData.messageStatusChanges ?? []);
      setLastStatusSync(new Date().toISOString());

      const { data: conversationData } = await fetchConversations({ status: 'active', conversationId });
      const activeConversation = conversationData.conversations.find((item) => item._id === conversationId);
      if (activeConversation?.unreadCount) {
        clearUnreadCount(activeConversation.unreadCount);
      }
      await markConversationRead(conversationId);
      const { data: sessionResult } = await fetchSessionByConversation(conversationId);
      setSessionData(sessionResult.session);
    } catch (pollError) {
      // ignore polling errors
    }
  }, [applyStatusChanges, clearUnreadCount, conversationId, lastKnownTimestamp, lastStatusSync, mergeMessages]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);


  const reloadSession = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await fetchSessionByConversation(conversationId);
    setSessionData(data.session);
  }, [conversationId]);

  useEffect(() => {
    void reloadSession();
  }, [reloadSession]);

  const hasRatedCurrentUser = useMemo(
    () => Boolean(currentUserId && sessionData?.completedBy?.some((participantId) => String(participantId) === currentUserId)),
    [currentUserId, sessionData?.completedBy]
  );
  const isCurrentUserEndRequester = useMemo(
    () => Boolean(currentUserId && sessionData?.endingRequestedBy && String(sessionData.endingRequestedBy) === currentUserId),
    [currentUserId, sessionData?.endingRequestedBy]
  );
  const canCurrentUserRate = useMemo(
    () => Boolean(
      !hasRatedCurrentUser
      && (
        sessionData?.status === 'completed'
        || (sessionData?.status === 'pending_confirmation' && isCurrentUserEndRequester)
      )
    ),
    [hasRatedCurrentUser, isCurrentUserEndRequester, sessionData?.status]
  );
  const ratingPromptKey = useMemo(
    () => (sessionData?._id && currentUserId ? `${sessionData._id}:${currentUserId}:${sessionData.status}:${hasRatedCurrentUser}` : null),
    [currentUserId, hasRatedCurrentUser, sessionData?._id, sessionData?.status]
  );

  useEffect(() => {
    if (!ratingPromptKey) {
      setDismissedRatingPromptKey(null);
      setOpenRating(false);
      return;
    }

    if (!canCurrentUserRate) {
      setDismissedRatingPromptKey(null);
      setOpenRating(false);
      return;
    }

    if (dismissedRatingPromptKey !== ratingPromptKey) {
      setOpenRating(true);
    }
  }, [canCurrentUserRate, dismissedRatingPromptKey, ratingPromptKey]);

  useEffect(() => {
    if (conversation?.unreadCount) {
      clearUnreadCount(conversation.unreadCount);
    }
  }, [clearUnreadCount, conversation?.unreadCount]);

  useEffect(() => {
    void fetchInitialMessages();
  }, [fetchInitialMessages]);

  useSmartPolling({
    interval: 1500,
    fetchFn: pollMessages,
    enabled: Boolean(conversationId)
  });

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleExtend = async () => {
    if (!conversationId) return;
    try {
      const { data } = await extendConversation(conversationId);
      setConversation(data.conversation);
    } catch (error) {
      setError('Extension indisponible pour le moment.');
    }
  };

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
    if (!conversationId || !body.trim() || sending || isExpired) return;
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
      setLastKnownTimestamp(data.message.createdAt);
      setLastStatusSync(new Date().toISOString());
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
      setLastKnownTimestamp(data.message.createdAt);
      setLastStatusSync(new Date().toISOString());
    } catch (sendError) {
      setError('Nouvel échec d\'envoi.');
    }
  };

  const expiresAtMs = conversation?.expiresAt ? new Date(conversation.expiresAt).getTime() : null;
  const remainingMs = expiresAtMs ? expiresAtMs - now : null;
  const remainingTotalSeconds = remainingMs !== null ? Math.max(0, Math.floor(remainingMs / 1000)) : null;
  const isExpired = remainingTotalSeconds !== null && remainingTotalSeconds <= 0;
  const remainingDays = remainingTotalSeconds !== null ? Math.floor(remainingTotalSeconds / (24 * 60 * 60)) : null;
  const remainingHours = remainingTotalSeconds !== null ? Math.floor((remainingTotalSeconds % (24 * 60 * 60)) / (60 * 60)) : null;
  const remainingMinutes = remainingTotalSeconds !== null ? Math.floor((remainingTotalSeconds % (60 * 60)) / 60) : null;
  const remainingSeconds = remainingTotalSeconds !== null ? remainingTotalSeconds % 60 : null;
  const canExtend = remainingDays !== null && remainingDays <= 2 && remainingDays >= 0 && !isExpired;
  const isSessionParticipant = Boolean(
    currentUserId && sessionData?.participants?.some((participantId) => String(participantId) === currentUserId)
  );
  const showEndSessionButton = Boolean(
    isSessionParticipant && sessionData?.status === 'in_progress'
  );
  const isPendingConfirmation = sessionData?.status === 'pending_confirmation';
  const canConfirmEnd = Boolean(isPendingConfirmation && currentUserId && !sessionData?.confirmedBy?.some((participantId) => String(participantId) === currentUserId));
  const isSessionCompleted = sessionData?.status === 'completed';

  useEffect(() => {
    if (isPendingConfirmation && canConfirmEnd) {
      setOpenPendingEndModal(true);
      return;
    }
    setOpenPendingEndModal(false);
  }, [canConfirmEnd, isPendingConfirmation]);

  const handleRequestSessionEnd = async () => {
    if (!sessionData?._id || endingSession) return;
    setEndingSession(true);
    try {
      const { data } = await requestSessionEnd(sessionData._id);
      setSessionData(data.session);
      setOpenEndSessionModal(false);
    } finally {
      setEndingSession(false);
    }
  };

  const conversationTitle = useMemo(() => {
    if (!conversation) return 'Conversation';
    return conversation.otherParticipant?.username ?? 'Contact';
  }, [conversation]);

  const renderTicks = (message: ConversationMessageItem) => {
    if (message.senderId !== currentUserId) return null;
    if (message.readAt) {
      return <CheckCheck size={14} className="text-amber-500" />;
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
        <div className="flex gap-2">
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
      </div>

      {isSessionCompleted ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          تم إغلاق الجلسة.
        </div>
      ) : isPendingConfirmation ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-center justify-between">
          <div>
            {canConfirmEnd ? 'تم طلب إنهاء هذه الجلسة من الطرف الآخر. يرجى التأكيد لإتمام الإغلاق النهائي.' : 'تم إرسال طلب إنهاء الجلسة. في انتظار تأكيد الطرف الآخر.'}
            {sessionData?.completionDeadlineAt ? ` مهلة التأكيد خلال 48 ساعة (${Math.max(0, Math.floor((new Date(sessionData.completionDeadlineAt).getTime() - now) / 3600000))}h).` : ''}
          </div>
          <div className="flex gap-2">
            {canConfirmEnd ? <button type="button" className="primary-btn" onClick={async () => { if (!sessionData?._id) return; const { data } = await confirmSessionEnd(sessionData._id); setSessionData(data.session); }}>Confirmer</button> : null}
          </div>
        </div>
      ) : remainingTotalSeconds !== null ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {isExpired ? (
            <div className="font-semibold">Conversation expired</div>
          ) : (
            <div>⏳ Conversation expires in {remainingDays}d {remainingHours}h {remainingMinutes}m {remainingSeconds}s</div>
          )}
          {remainingDays !== null && remainingDays <= 2 && !isExpired ? <div className="mt-1">⚠️ This conversation will be deleted soon.</div> : null}
          {canExtend ? (
            <button type="button" className="secondary-btn mt-2" onClick={handleExtend}>Extend 7 days</button>
          ) : null}
          {showEndSessionButton ? (
            <button
              type="button"
              className="secondary-btn mt-2 ms-2"
              onClick={() => setOpenEndSessionModal(true)}
            >
              End Session
            </button>
          ) : null}
        </div>
      ) : null}

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
          disabled={isExpired}
        />
        <button
          type="button"
          className="primary-btn"
          onClick={handleSend}
          disabled={sending || isExpired}
        >
          <SendHorizonal size={16} className="me-1" /> Envoyer
        </button>
        </div>

      {sessionData?._id && conversation?.otherParticipant?.id ? (
        <RatingModal
          open={openRating}
          onClose={() => {
            setOpenRating(false);
            if (ratingPromptKey) setDismissedRatingPromptKey(ratingPromptKey);
          }}
          onSubmitted={() => {
            setDismissedRatingPromptKey(null);
            void reloadSession();
          }}
          sessionId={sessionData._id}
          targetUserId={conversation.otherParticipant.id}
        />
      ) : null}

      <Dialog open={openEndSessionModal} onOpenChange={(next) => !endingSession && setOpenEndSessionModal(next)}>
        <DialogContent className="sm:max-w-md space-y-4">
          <DialogHeader>
            <DialogTitle>تأكيد إنهاء الجلسة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-700">
            سيتم إنهاء الجلسة الحالية وإغلاق هذه المحادثة. يمكنك دائماً بدء تواصل جديد لاحقاً. هل تريد المتابعة؟
          </p>
          <DialogFooter className="gap-2 sm:justify-end">
            <button type="button" className="secondary-btn" disabled={endingSession} onClick={() => setOpenEndSessionModal(false)}>
              رجوع
            </button>
            <button type="button" className="primary-btn" disabled={endingSession} onClick={() => { void handleRequestSessionEnd(); }}>
              {endingSession ? 'جارٍ الإنهاء...' : 'تأكيد الإنهاء'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openPendingEndModal} onOpenChange={setOpenPendingEndModal}>
        <DialogContent className="sm:max-w-md space-y-4">
          <DialogHeader>
            <DialogTitle>تأكيد إنهاء الجلسة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-700">
            تم طلب إنهاء هذه الجلسة من الطرف الآخر. يرجى تأكيد الإنهاء لإغلاق الجلسة نهائياً.
          </p>
          <DialogFooter className="gap-2 sm:justify-end">
            <button type="button" className="secondary-btn" onClick={() => setOpenPendingEndModal(false)}>
              إغلاق
            </button>
            {canConfirmEnd ? (
              <button
                type="button"
                className="primary-btn"
                onClick={async () => {
                  if (!sessionData?._id) return;
                  const { data } = await confirmSessionEnd(sessionData._id);
                  setSessionData(data.session);
                  setOpenPendingEndModal(false);
                }}
              >
                تأكيد الإنهاء
              </button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConversationPage;
