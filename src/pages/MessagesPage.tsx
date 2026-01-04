import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Check,
  CheckCheck,
  MessageCircle,
  MoreHorizontal,
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
import { useAuth } from '../context/AuthContext';
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

const POLL_INTERVAL = 20000;
const LONG_PRESS_DURATION = 500;

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
  onDelete: (conversation: ConversationSummary) => void;
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
  onDelete,
  onToggleSelect,
  onSelectShortcut,
  renderLastMessageStatus
}) => {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const longPressTimeout = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const clearLongPress = () => {
    if (longPressTimeout.current) {
      window.clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
    if (!selectionMode) {
      longPressTriggered.current = false;
      longPressTimeout.current = window.setTimeout(() => {
        longPressTriggered.current = true;
        onSelectShortcut(conversation._id);
      }, LONG_PRESS_DURATION);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    clearLongPress();
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      pointerStart.current = null;
      return;
    }
    if (selectionMode) {
      pointerStart.current = null;
      return;
    }
    if (!pointerStart.current) return;
    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
      onClose();
      return;
    }
    onOpen(conversation._id, deltaX < 0 ? 'left' : 'right');
  };

  const translateX = isOpen && !selectionMode ? (openDirection === 'left' ? -96 : 96) : 0;
  const actionLabel = isArchivedTab ? 'Restaurer' : 'Archiver';
  const actionIcon = isArchivedTab ? <RotateCcw size={16} /> : <Archive size={16} />;

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        clearLongPress();
        pointerStart.current = null;
        onClose();
      }}
      onPointerLeave={() => {
        clearLongPress();
        pointerStart.current = null;
      }}
    >
      <div className="absolute inset-0 flex items-center justify-between">
        <button
          type="button"
          className="h-full w-24 px-3 text-sm font-semibold text-slate-700 bg-slate-100 flex items-center justify-center gap-2"
          onClick={() => onArchiveToggle(conversation)}
        >
          {actionIcon}
          {actionLabel}
        </button>
        <button
          type="button"
          className="h-full w-24 px-3 text-sm font-semibold text-white bg-rose-500 flex items-center justify-center gap-2"
          onClick={() => onDelete(conversation)}
        >
          <Trash2 size={16} />
          Supprimer
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            onClose();
            return;
          }
          if (selectionMode) {
            onToggleSelect(conversation._id);
            return;
          }
          onNavigate(conversation._id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onSelectShortcut(conversation._id);
        }}
        className={`relative w-full text-start card-surface p-4 hover:shadow transition ${
          isSelected ? 'ring-2 ring-emerald-400' : ''
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <button
          type="button"
          aria-label="Sélectionner"
          className="absolute top-3 right-3 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          onClick={(event) => {
            event.stopPropagation();
            onSelectShortcut(conversation._id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal size={16} />
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900">
              {conversation.otherParticipant?.username ?? 'Contact'}
            </p>
            {isPinned && <Pin size={14} className="text-amber-500" />}
          </div>
          {conversation.unreadCount > 0 && !isArchivedTab && (
            <span className="badge-soft bg-emerald-50 text-emerald-700">
              {conversation.unreadCount} non lu(s)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {renderLastMessageStatus(conversation)}
          <p className="text-sm text-slate-600 line-clamp-1">
            {conversation.lastMessage?.text ?? 'Nouvelle conversation'}
          </p>
        </div>
        <p className="text-xs text-slate-400">
          {conversation.lastMessage?.createdAt
            ? new Date(conversation.lastMessage.createdAt).toLocaleString()
            : 'Aucun message'}
        </p>
      </button>
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
  const tab = searchParams.get('tab') === 'archived' ? 'archived' : 'active';
  const isArchivedTab = tab === 'archived';

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
        const { data } = await fetchConversations({ status: isArchivedTab ? 'archived' : 'active' });
        const sortedConversations = sortConversations(data.conversations);
        setConversations(sortedConversations);
        if (!isArchivedTab) {
          syncUnreadCounts(data.conversations);
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [isArchivedTab, sortConversations, syncUnreadCounts]
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
    if (!conversations.length) return 'Aucune conversation pour le moment';
    return `${conversations.length} conversation(s)`;
  }, [conversations.length]);

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
    <div className="card-surface p-4 space-y-4 min-h-[60vh]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{headerSubtitle}</p>
          <h2 className="section-title">Messages</h2>
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={tab === 'active' ? 'primary-btn' : 'secondary-btn'}
          onClick={() => handleChangeTab('active')}
        >
          Conversations
        </button>
        <button
          type="button"
          className={tab === 'archived' ? 'primary-btn' : 'secondary-btn'}
          onClick={() => handleChangeTab('archived')}
        >
          Archivées
        </button>
      </div>
      {selectedCount > 0 && (
        <div className="sticky top-0 z-20 -mx-4 px-4">
          <div className="card-surface p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="secondary-btn flex items-center gap-2"
                onClick={() => void handleBulkPinToggle(allSelectedPinned)}
              >
                {allSelectedPinned ? <PinOff size={16} /> : <Pin size={16} />}
                {allSelectedPinned ? 'Désépingler' : 'Épingler'}
              </button>
              <button
                type="button"
                className="secondary-btn flex items-center gap-2"
                onClick={() => void handleBulkArchiveToggle()}
              >
                {isArchivedTab ? <RotateCcw size={16} /> : <Archive size={16} />}
                {isArchivedTab ? 'Restaurer' : 'Archiver'}
              </button>
              <button
                type="button"
                className="secondary-btn flex items-center gap-2 text-rose-600"
                onClick={() => setDeleteTargetIds(Array.from(selectedIds))}
              >
                <Trash2 size={16} />
                Supprimer
              </button>
              <button
                type="button"
                className="secondary-btn flex items-center gap-2"
                onClick={clearSelection}
              >
                <X size={16} />
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {loading && <p className="text-sm text-slate-500">Chargement des conversations...</p>}
        {!loading && !conversations.length && (
          <p className="text-sm text-slate-500">Aucun échange pour le moment.</p>
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
            onDelete={(item) => {
              setDeleteTargetIds([item._id]);
              setOpenRow(null);
            }}
            onToggleSelect={(id) => toggleSelection(id)}
            onSelectShortcut={(id) => handleSelectShortcut(id)}
            renderLastMessageStatus={renderLastMessageStatus}
          />
        ))}
      </div>
      <div className="text-sm text-slate-500 flex items-center gap-2">
        <MessageCircle className="text-emerald-600" size={18} />
        Discussions sécurisées et accessibles sur mobile.
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
    </div>
  );
};

export default MessagesPage;
