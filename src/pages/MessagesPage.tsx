import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Check,
  CheckCheck,
  Inbox,
  MessageCircle,
  Pin,
  PinOff,
  RefreshCw,
  RotateCcw,
  Trash2,
  X
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  archiveConversation,
  deleteConversationForMe,
  fetchConversations,
  pinConversation,
  type ConversationSummary,
  unarchiveConversation,
  unpinConversation
} from '../lib/http';
import { useConversations } from '../context/ConversationsContext';
import { useSmartPolling } from '../hooks/useSmartPolling';
import EmptyState from '../components/common/EmptyState';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../components/ui/alert-dialog';

const LONG_PRESS_DURATION = 450;
const LONG_PRESS_MOVE_THRESHOLD = 10;

const isTextTarget = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  return Boolean(
    node.closest(
      'p, span, a, h1, h2, h3, h4, h5, h6, strong, em, small, label, time, code, pre, input, textarea, select'
    ) || node.closest('[data-allow-text-select="true"]')
  );
};

interface ConversationRowProps {
  conversation: ConversationSummary;
  isArchivedTab: boolean;
  isOpen: boolean;
  openDirection: 'left' | 'right' | null;
  isSelected: boolean;
  selectionMode: boolean;
  isPinned: boolean;
  onOpen: (id: string, direction: 'left' | 'right') => void;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onArchiveToggle: (conversation: ConversationSummary) => void;
  onToggleSelect: (id: string) => void;
  onSelectShortcut: (id: string) => void;
  renderLastMessageStatus: (conversation: ConversationSummary) => React.ReactNode;
}

const ConversationRow: React.FC<ConversationRowProps> = ({
  conversation,
  isArchivedTab,
  isOpen,
  openDirection,
  isSelected,
  selectionMode,
  isPinned,
  onOpen,
  onClose,
  onNavigate,
  onArchiveToggle,
  onToggleSelect,
  onSelectShortcut,
  renderLastMessageStatus
}) => {
  const { t } = useLanguage();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const longPressTimeout = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimeout = useRef<number | null>(null);
  const movedRef = useRef(false);

  const clearLongPress = () => {
    if (longPressTimeout.current) {
      window.clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const clearSuppressClickTimeout = () => {
    if (suppressClickTimeout.current) {
      window.clearTimeout(suppressClickTimeout.current);
      suppressClickTimeout.current = null;
    }
  };

  const handleCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isTextTarget(event.target)) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
    movedRef.current = false;
    longPressTimeout.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      clearSuppressClickTimeout();
      suppressClickTimeout.current = window.setTimeout(() => {
        suppressClickRef.current = false;
        suppressClickTimeout.current = null;
      }, 600);
      onSelectShortcut(conversation._id);
    }, LONG_PRESS_DURATION);
  };

  const handleCardPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current || movedRef.current) return;
    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    if (Math.abs(deltaX) > LONG_PRESS_MOVE_THRESHOLD || Math.abs(deltaY) > LONG_PRESS_MOVE_THRESHOLD) {
      movedRef.current = true;
      clearLongPress();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    clearLongPress();
    if (selectionMode) {
      pointerStart.current = null;
      movedRef.current = false;
      return;
    }
    if (!pointerStart.current) return;
    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    pointerStart.current = null;
    movedRef.current = false;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
      onClose();
      return;
    }
    onOpen(conversation._id, deltaX < 0 ? 'left' : 'right');
  };

  const translateX = isOpen && !selectionMode ? (openDirection === 'left' ? -112 : 112) : 0;
  const actionLabel = isArchivedTab ? t.messages.restore : t.messages.archive;
  const actionIcon = isArchivedTab ? <RotateCcw size={16} /> : <Archive size={16} />;
  const handleCardClick = (event?: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      event?.preventDefault();
      event?.stopPropagation();
      return;
    }
    if (isOpen) {
      event?.preventDefault();
      event?.stopPropagation();
      onClose();
      return;
    }
    if (selectionMode) {
      event?.preventDefault();
      event?.stopPropagation();
      onToggleSelect(conversation._id);
      return;
    }
    onNavigate(conversation._id);
  };

  return (
    <div className="relative overflow-hidden rounded-[1.5rem]">
      <div className={`absolute inset-0 flex items-center ${openDirection === 'left' ? 'justify-end' : 'justify-start'}`}>
        <button
          type="button"
          className="flex h-full w-28 items-center justify-center gap-2 bg-slate-100 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          onClick={() => onArchiveToggle(conversation)}
          aria-label={actionLabel}
        >
          {actionIcon}
          {actionLabel}
        </button>
      </div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardClick();
          }
        }}
        onPointerDown={handleCardPointerDown}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          clearLongPress();
          pointerStart.current = null;
          movedRef.current = false;
          onClose();
        }}
        onPointerLeave={() => {
          clearLongPress();
          pointerStart.current = null;
          movedRef.current = false;
        }}
        onClick={handleCardClick}
        onContextMenu={(event) => {
          event.preventDefault();
          onSelectShortcut(conversation._id);
        }}
        className={`relative w-full rounded-[1.5rem] border border-white/70 bg-white/95 p-4 text-start shadow-sm transition-all duration-200 ${
          selectionMode ? 'cursor-pointer' : 'hover:-translate-y-0.5 hover:shadow-card'
        } ${isSelected ? 'bg-emerald-50 ring-2 ring-emerald-300 ring-inset' : ''} active:bg-slate-100`}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {isSelected && (
          <span className="absolute start-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
            <Check size={12} />
          </span>
        )}
        <div
          data-allow-text-select="true"
          style={{ userSelect: 'text' }}
          className={`relative z-10 flex items-center gap-3 ${isSelected ? 'ps-7' : ''}`}
        >
          <div className="relative shrink-0">
            <Avatar className="h-12 w-12 border border-white shadow-sm">
              <AvatarImage src={conversation.otherParticipant?.profile?.avatarUrl} alt={conversation.otherParticipant?.username ?? 'Contact'} />
              <AvatarFallback className="bg-emerald-50 font-black text-emerald-700">
                {(conversation.otherParticipant?.username ?? 'C')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 end-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" aria-label={t.common.online} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate font-black text-slate-950">{conversation.otherParticipant?.username ?? 'Contact'}</p>
                {isPinned && <Pin size={14} className="shrink-0 text-amber-500" aria-label={t.common.pinned} />}
              </div>
              {conversation.unreadCount > 0 && !isArchivedTab && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-black text-white">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {renderLastMessageStatus(conversation)}
              <p className="line-clamp-1 text-sm font-medium text-slate-600">
                {conversation.lastMessage?.text ?? t.messages.newConversation}
              </p>
            </div>
            <p className="text-xs font-medium text-slate-400">
              {conversation.lastMessage?.createdAt
                ? new Date(conversation.lastMessage.createdAt).toLocaleString()
                : t.messages.noMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [openRow, setOpenRow] = useState<{ id: string; direction: 'left' | 'right' } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { syncUnreadCounts } = useConversations();
  const { currentUserId } = useAuth();
  const { t } = useLanguage();
  const tab = searchParams.get('tab') === 'archived' ? 'archived' : 'active';
  const isArchivedTab = tab === 'archived';
  const lastKnownTimestampRef = useRef<string | undefined>(undefined);

  const isConversationPinned = useCallback(
    (conversation: ConversationSummary) =>
      Boolean(currentUserId && conversation.pinnedBy?.includes(currentUserId)),
    [currentUserId]
  );

  const sortConversations = useCallback(
    (items: ConversationSummary[]) => {
      return [...items].sort((a, b) => {
        const aPinned = isConversationPinned(a);
        const bPinned = isConversationPinned(b);
        if (aPinned !== bPinned) {
          return aPinned ? -1 : 1;
        }
        const aDate = new Date(a.lastMessageAt ?? a.updatedAt ?? 0).getTime();
        const bDate = new Date(b.lastMessageAt ?? b.updatedAt ?? 0).getTime();
        return bDate - aDate;
      });
    },
    [isConversationPinned]
  );

  const clearSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleLoad = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const { data } = await fetchConversations({
          status: isArchivedTab ? 'archived' : 'active',
          after: lastKnownTimestampRef.current
        });
        const sortedConversations = sortConversations(data.conversations);
        setConversations(sortedConversations);
        if (!isArchivedTab) {
          syncUnreadCounts(data.conversations);
        }
        lastKnownTimestampRef.current = new Date().toISOString();
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [isArchivedTab, sortConversations, syncUnreadCounts]
  );

  useEffect(() => {
    void handleLoad(true);
  }, [handleLoad]);

  useSmartPolling({
    interval: 1500,
    fetchFn: handleLoad,
    enabled: true
  });

  useEffect(() => {
    clearSelection();
  }, [tab, clearSelection]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await handleLoad();
    } finally {
      setRefreshing(false);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (!conversations.length) return t.messages.subtitleEmpty;
    return `${conversations.length} ${t.messages.subtitleCount}`;
  }, [conversations.length, t.messages.subtitleCount, t.messages.subtitleEmpty]);

  const handleChangeTab = (nextTab: 'active' | 'archived') => {
    setSearchParams(nextTab === 'archived' ? { tab: 'archived' } : {});
    setOpenRow(null);
    clearSelection();
  };

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) {
        setSelectionMode(false);
      }
      return next;
    });
  }, []);

  const handleSelectShortcut = useCallback(
    (id: string) => {
      setSelectionMode(true);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        if (next.size === 0) {
          setSelectionMode(false);
        }
        return next;
      });
      setOpenRow(null);
    },
    []
  );

  const handleArchiveToggle = async (conversation: ConversationSummary) => {
    if (isArchivedTab) {
      await unarchiveConversation(conversation._id);
    } else {
      await archiveConversation(conversation._id);
    }
    setOpenRow(null);
    clearSelection();
    await handleLoad();
  };

  const handleBulkArchiveToggle = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await Promise.all(
      ids.map((id) => (isArchivedTab ? unarchiveConversation(id) : archiveConversation(id)))
    );
    clearSelection();
    await handleLoad();
  };

  const handleBulkPinToggle = async (shouldUnpin: boolean) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await Promise.all(ids.map((id) => (shouldUnpin ? unpinConversation(id) : pinConversation(id))));
    clearSelection();
    await handleLoad();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetIds.length) return;
    const ids = [...deleteTargetIds];
    setConversations((prev) => prev.filter((conversation) => !ids.includes(conversation._id)));
    setDeleteTargetIds([]);
    setOpenRow(null);
    clearSelection();
    await Promise.all(ids.map((id) => deleteConversationForMe(id)));
    await handleLoad();
  };

  const renderLastMessageStatus = (conversation: ConversationSummary) => {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage || lastMessage.senderId !== currentUserId) return null;
    if (lastMessage.readAt) {
      return <CheckCheck size={14} className="text-amber-500" />;
    }
    if (lastMessage.deliveredAt) {
      return <CheckCheck size={14} className="text-slate-400" />;
    }
    return <Check size={14} className="text-slate-300" />;
  };

  const selectedConversations = useMemo(
    () => conversations.filter((conversation) => selectedIds.has(conversation._id)),
    [conversations, selectedIds]
  );
  const selectedCount = selectedIds.size;
  const allSelectedPinned =
    selectedConversations.length > 0 && selectedConversations.every(isConversationPinned);

  return (
    <section className="premium-panel min-h-[70vh] space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{headerSubtitle}</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">{t.messages.title}</h1>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin me-1' : 'me-1'} />
          {t.messages.refresh}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={tab === 'active' ? 'primary-btn' : 'secondary-btn'}
          onClick={() => handleChangeTab('active')}
        >
          {t.messages.active}
        </button>
        <button
          type="button"
          className={tab === 'archived' ? 'primary-btn' : 'secondary-btn'}
          onClick={() => handleChangeTab('archived')}
        >
          {t.messages.archived}
        </button>
      </div>
      {selectedCount > 0 && (
        <div className="sticky top-0 z-20 -mx-4 px-4">
          <div className="card-surface p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              {selectedCount} {t.messages.selected}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="secondary-btn flex items-center gap-2"
                onClick={() => void handleBulkPinToggle(allSelectedPinned)}
              >
                {allSelectedPinned ? <PinOff size={16} /> : <Pin size={16} />}
                {allSelectedPinned ? t.messages.unpin : t.messages.pin}
              </button>
              <button
                type="button"
                className="secondary-btn flex items-center gap-2"
                onClick={() => void handleBulkArchiveToggle()}
              >
                {isArchivedTab ? <RotateCcw size={16} /> : <Archive size={16} />}
                {isArchivedTab ? t.messages.restore : t.messages.archive}
              </button>
              <button
                type="button"
                className="secondary-btn flex items-center gap-2 text-rose-600"
                onClick={() => setDeleteTargetIds(Array.from(selectedIds))}
              >
                <Trash2 size={16} />
                {t.messages.delete}
              </button>
              <button
                type="button"
                className="secondary-btn flex items-center gap-2"
                onClick={clearSelection}
              >
                <X size={16} />
                {t.messages.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {loading && <div className="rounded-3xl bg-white/70 p-5 text-sm font-semibold text-slate-500">{t.messages.loading}</div>}
        {!loading && !conversations.length && (
          <EmptyState icon={Inbox} title={t.messages.emptyTitle} description={t.messages.emptyDescription} />
        )}
        {conversations.map((conversation) => (
          <ConversationRow
            key={conversation._id}
            conversation={conversation}
            isArchivedTab={isArchivedTab}
            isOpen={openRow?.id === conversation._id}
            openDirection={openRow?.id === conversation._id ? openRow.direction : null}
            isSelected={selectedIds.has(conversation._id)}
            selectionMode={selectionMode}
            isPinned={isConversationPinned(conversation)}
            onOpen={(id, direction) => setOpenRow({ id, direction })}
            onClose={() => setOpenRow(null)}
            onNavigate={(id) => {
              clearSelection();
              navigate(`/messages/${id}`);
            }}
            onArchiveToggle={(item) => void handleArchiveToggle(item)}
            onToggleSelect={(id) => toggleSelection(id)}
            onSelectShortcut={(id) => handleSelectShortcut(id)}
            renderLastMessageStatus={renderLastMessageStatus}
          />
        ))}
      </div>
      <div className="text-sm text-slate-500 flex items-center gap-2">
        <MessageCircle className="text-emerald-600" size={18} />
        {t.messages.secure}
      </div>
      <AlertDialog open={Boolean(deleteTargetIds.length)} onOpenChange={(open) => !open && setDeleteTargetIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTargetIds.length > 1
                ? 'Supprimer ces conversations ?'
                : 'Supprimer cette conversation ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprime la conversation de votre liste uniquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteConfirm()}>
              Oui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default MessagesPage;
