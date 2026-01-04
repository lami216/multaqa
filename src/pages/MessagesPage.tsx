import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Check, CheckCheck, MessageCircle, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  archiveConversation,
  deleteConversationForMe,
  fetchConversations,
  type ConversationSummary,
  unarchiveConversation
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

interface ConversationRowProps {
  conversation: ConversationSummary;
  isArchivedTab: boolean;
  isOpen: boolean;
  openDirection: 'left' | 'right' | null;
  onOpen: (id: string, direction: 'left' | 'right') => void;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onArchiveToggle: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
  renderLastMessageStatus: (conversation: ConversationSummary) => React.ReactNode;
}

const ConversationRow: React.FC<ConversationRowProps> = ({
  conversation,
  isArchivedTab,
  isOpen,
  openDirection,
  onOpen,
  onClose,
  onNavigate,
  onArchiveToggle,
  onDelete,
  renderLastMessageStatus
}) => {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
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
  const translateX = isOpen ? (openDirection === 'left' ? -96 : 96) : 0;
  const actionLabel = isArchivedTab ? 'Restaurer' : 'Archiver';
  const actionIcon = isArchivedTab ? <RotateCcw size={16} /> : <Archive size={16} />;

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={onClose}
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
          onNavigate(conversation._id);
        }}
        className="relative w-full text-start card-surface p-4 hover:shadow transition"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">
            {conversation.otherParticipant?.username ?? 'Contact'}
          </p>
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
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | null>(null);
  const [openRow, setOpenRow] = useState<{ id: string; direction: 'left' | 'right' } | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { syncUnreadCounts } = useConversations();
  const { currentUserId } = useAuth();
  const tab = searchParams.get('tab') === 'archived' ? 'archived' : 'active';
  const isArchivedTab = tab === 'archived';

  const handleLoad = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const { data } = await fetchConversations({ status: isArchivedTab ? 'archived' : 'active' });
        setConversations(data.conversations);
        if (!isArchivedTab) {
          syncUnreadCounts(data.conversations);
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [isArchivedTab, syncUnreadCounts]
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

  const handleChangeTab = (nextTab: 'active' | 'archived') => {
    setSearchParams(nextTab === 'archived' ? { tab: 'archived' } : {});
    setOpenRow(null);
  };

  const handleArchiveToggle = async (conversation: ConversationSummary) => {
    if (isArchivedTab) {
      await unarchiveConversation(conversation._id);
    } else {
      await archiveConversation(conversation._id);
    }
    setOpenRow(null);
    await handleLoad();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteConversationForMe(deleteTarget._id);
    setDeleteTarget(null);
    setOpenRow(null);
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
            onOpen={(id, direction) => setOpenRow({ id, direction })}
            onClose={() => setOpenRow(null)}
            onNavigate={(id) => navigate(`/messages/${id}`)}
            onArchiveToggle={(item) => void handleArchiveToggle(item)}
            onDelete={(item) => setDeleteTarget(item)}
            renderLastMessageStatus={renderLastMessageStatus}
          />
        ))}
      </div>
      <div className="text-sm text-slate-500 flex items-center gap-2">
        <MessageCircle className="text-emerald-600" size={18} />
        Discussions sécurisées et accessibles sur mobile.
      </div>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
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
