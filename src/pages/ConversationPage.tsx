import { Check, CheckCheck, ChevronLeft, MessageCircle, RefreshCw, SendHorizonal } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import RatingModal from '../components/RatingModal';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../context/ConversationsContext';
import { useLanguage } from '../context/LanguageContext';
import { useSmartPolling } from '../hooks/useSmartPolling';
import {
  type ConversationMessageItem,
  type ConversationSummary,
  confirmSessionEnd,
  extendConversation,
  fetchConversationMessages,
  fetchConversations,
  fetchMessageStatusChanges,
  fetchSessionByConversation,
  markConversationRead,
  requestSessionEnd,
  type SessionItem, 
  sendConversationMessage
} from '../lib/http';

const ConversationPage: React.FC = () => {
  const { conversationId } = useParams();
  const { currentUserId } = useAuth();
  const { t } = useLanguage();
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
  const isPendingConfirmation = sessionData?.status === 'pending_confirmation';
  const canConfirmEnd = Boolean(isPendingConfirmation && currentUserId && !sessionData?.confirmedBy?.some((participantId) => String(participantId) === currentUserId));
  const showEndSessionButton = Boolean(
    isSessionParticipant && (sessionData?.status === 'in_progress' || canConfirmEnd)
  );
  const isSessionCompleted = sessionData?.status === 'completed';
  const isSessionActive = sessionData?.status === 'in_progress';
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
        <h1 className="text-xl font-black text-slate-950">{t.conversation.notFound}</h1>
        <Link to="/messages" className="primary-btn w-fit">{t.conversation.back}</Link>
      </div>
    );
  }

  return (
    <>
      <section className="premium-panel flex min-h-[75vh] flex-col overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white/85 p-4">
          <div className="flex items-center gap-3">
            <button type="button" className="secondary-btn px-3" onClick={() => navigate('/messages')}>
              <ChevronLeft size={16} /> {t.conversation.back}
            </button>
            <div>
              <p className="text-sm font-semibold text-emerald-700">{t.messages.title}</p>
              <h1 className="text-xl font-black tracking-tight text-slate-950">{conversationTitle}</h1>
            </div>
          </div>
          <button type="button" className="secondary-btn" onClick={handleManualRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> {t.conversation.refresh}
          </button>
        </div>

        {isSessionCompleted ? (
          <div className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            تم إغلاق الجلسة.
          </div>
        ) : isPendingConfirmation ? (
          <div className="mx-4 mt-4 flex items-center justify-between gap-2 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            <div>
              {canConfirmEnd ? 'تم طلب إنهاء هذه الجلسة من الطرف الآخر. يرجى التأكيد لإتمام الإغلاق النهائي.' : 'تم إرسال طلب إنهاء الجلسة. في انتظار تأكيد الطرف الآخر.'}
              {sessionData?.completionDeadlineAt ? ` مهلة التأكيد خلال 48 ساعة (${Math.max(0, Math.floor((new Date(sessionData.completionDeadlineAt).getTime() - now) / 3600000))}h).` : ''}
            </div>
            {canConfirmEnd ? <button type="button" className="secondary-btn" onClick={() => setOpenPendingEndModal(true)}>{t.conversation.endSession}</button> : null}
          </div>
        ) : isSessionActive && remainingTotalSeconds !== null ? (
          <div className="mx-4 mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            {isExpired ? <div>{t.conversation.expired}</div> : <div>{t.conversation.expiresIn} {remainingDays}d {remainingHours}h {remainingMinutes}m {remainingSeconds}s</div>}
            {canExtend ? <button type="button" className="secondary-btn mt-2" onClick={handleExtend}>{t.conversation.extend}</button> : null}
            {showEndSessionButton ? (
              <button
                type="button"
                className="secondary-btn mt-2 ms-2"
                onClick={() => {
                  if (canConfirmEnd) {
                    setOpenPendingEndModal(true);
                    return;
                  }
                  setOpenEndSessionModal(true);
                }}
              >
                {t.conversation.endSession}
              </button>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="flex-1 p-5 text-sm font-semibold text-slate-500">{t.conversation.loading}</div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4 sm:p-6">
            {messages.map((message) => {
              const isOwn = message.senderId === currentUserId;
              const isFailed = message.text.includes('(échec)');
              return (
                <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} text-sm`}>
                  <div className={`max-w-[82%] rounded-[1.35rem] px-4 py-3 shadow-sm sm:max-w-[70%] ${isOwn ? 'rounded-ee-md bg-slate-950 text-white' : 'rounded-es-md bg-white text-slate-800 ring-1 ring-slate-200/70'}`}>
                    <p className="whitespace-pre-wrap leading-6">{message.text}</p>
                    <div className={`mt-1 flex items-center justify-between gap-2 text-[11px] ${isOwn ? 'text-slate-300' : 'text-slate-500'}`}>
                      <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {renderTicks(message)}
                    </div>
                    {isOwn && isFailed ? <button type="button" className="mt-2 text-[11px] underline" onClick={() => handleRetry(message)}>{t.common.retry}</button> : null}
                  </div>
                </div>
              );
            })}
            {!messages.length ? <EmptyState icon={MessageCircle} title={t.conversation.emptyTitle} description={t.conversation.emptyDescription} /> : null}
          </div>
        )}

        {error ? <p className="mx-4 text-sm font-semibold text-rose-600">{error}</p> : null}

        <div className="sticky bottom-0 flex gap-2 border-t border-slate-100 bg-white/95 p-3 backdrop-blur">
          <input
            className="min-w-0 flex-1"
            placeholder={t.conversation.placeholder}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            disabled={isExpired}
          />
          <button type="button" className="primary-btn" onClick={handleSend} disabled={sending || isExpired}>
            <SendHorizonal size={16} /> <span className="hidden sm:inline">{t.conversation.send}</span>
          </button>
        </div>
      </section>

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
    </>
  );
};

export default ConversationPage;
