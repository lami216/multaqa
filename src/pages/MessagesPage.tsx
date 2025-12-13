import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import apiClient, { type ChatMessage, type Conversation } from '../lib/apiClient';

const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    apiClient.getConversations().then((data) => {
      setConversations(data);
      if (data.length) {
        setActiveConversation(data[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!activeConversation) return;

    apiClient.getMessages(activeConversation.id).then(setMessages);
  }, [activeConversation]);

  const headerSubtitle = useMemo(() => {
    if (!activeConversation) return 'Sélectionnez une conversation pour commencer';
    return `En conversation avec ${activeConversation.name}`;
  }, [activeConversation]);

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
              key={conversation.id}
              onClick={() => setActiveConversation(conversation)}
              className={`w-full text-start card-surface p-3 hover:shadow transition ${
                activeConversation?.id === conversation.id ? 'ring-2 ring-emerald-100' : ''
              }`}
            >
              <p className="font-semibold text-slate-900">{conversation.name}</p>
              <p className="text-sm text-slate-600">{conversation.lastMessage}</p>
              <p className="text-xs text-slate-400">{conversation.time}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="card-surface p-4 space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div>
            <p className="text-sm text-slate-500">{headerSubtitle}</p>
            <p className="text-lg font-semibold text-slate-900">{activeConversation?.name ?? 'Aucun contact sélectionné'}</p>
          </div>
          <span className="badge-soft">IA</span>
        </div>
        <div className="space-y-3 min-h-[260px]">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.me ? 'justify-end' : 'justify-start'} text-sm`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.me ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p>{message.content}</p>
                <p className={`text-[11px] mt-1 ${message.me ? 'text-emerald-50' : 'text-slate-500'}`}>{message.time}</p>
              </div>
            </div>
          ))}
          {!messages.length && (
            <div className="text-sm text-slate-500">Aucun message pour cette conversation.</div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <input className="flex-1" placeholder="Envoyer un message..." />
          <button className="primary-btn">Envoyer</button>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
