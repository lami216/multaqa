import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { fetchChats, fetchMessages, sendMessage, type ChatMessageItem, type ChatSummary } from '../lib/http';

const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<ChatSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatSummary | null>(null);
  const [body, setBody] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchChats();
      setConversations(data.chats);
      if (data.chats.length) {
        setActiveConversation(data.chats[0]);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!activeConversation) return;

    const loadMessages = async () => {
      const { data } = await fetchMessages(activeConversation._id);
      setMessages(data.messages);
    };

    void loadMessages();
  }, [activeConversation]);

  const headerSubtitle = useMemo(() => {
    if (!activeConversation) return 'Sélectionnez une conversation pour commencer';
    return `En conversation avec ${activeConversation.otherParticipant.username}`;
  }, [activeConversation]);

  const handleSend = async () => {
    if (!activeConversation || !body.trim()) return;
    await sendMessage(activeConversation._id, body);
    setBody('');
    const { data } = await fetchMessages(activeConversation._id);
    setMessages(data.messages);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4 min-h-[60vh]">
      <div className="card-surface p-4 space-y-3 lg:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Conversations</h2>
          <MessageCircle className="text-emerald-600" />
        </div>
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation._id}
              onClick={() => setActiveConversation(conversation)}
              className={`w-full text-start card-surface p-3 hover:shadow transition ${
                activeConversation?._id === conversation._id ? 'ring-2 ring-emerald-100' : ''
              }`}
            >
              <p className="font-semibold text-slate-900">{conversation.otherParticipant.username}</p>
              <p className="text-sm text-slate-600 line-clamp-1">{conversation.lastMessage?.body ?? 'Nouvelle conversation'}</p>
              <p className="text-xs text-slate-400">{conversation.unreadCount} non lus</p>
            </button>
          ))}
          {!conversations.length && <p className="text-sm text-slate-500">Aucun échange pour le moment.</p>}
        </div>
      </div>

      <div className="card-surface p-4 space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div>
            <p className="text-sm text-slate-500">{headerSubtitle}</p>
            <p className="text-lg font-semibold text-slate-900">{activeConversation?.otherParticipant.username ?? 'Aucun contact sélectionné'}</p>
          </div>
          <span className="badge-soft">Sécurisé</span>
        </div>
        <div className="space-y-3 min-h-[260px]">
          {messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${message.senderId._id === activeConversation?.otherParticipant.id ? 'justify-start' : 'justify-end'} text-sm`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.senderId._id === activeConversation?.otherParticipant.id
                    ? 'bg-slate-100 text-slate-800'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                <p>{message.body}</p>
                <p className={`text-[11px] mt-1 ${message.senderId._id === activeConversation?.otherParticipant.id ? 'text-slate-500' : 'text-emerald-50'}`}>
                  {new Date(message.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {!messages.length && (
            <div className="text-sm text-slate-500">Aucun message pour cette conversation.</div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="flex-1"
            placeholder="Envoyer un message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button className="primary-btn" type="button" onClick={handleSend}>Envoyer</button>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
