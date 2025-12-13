import React from 'react';
import { MessageCircle } from 'lucide-react';

const conversations = [
  { id: 1, name: 'Sara Benali', lastMessage: 'On révise demain à 18h ?', time: '18:20' },
  { id: 2, name: 'Omar Lahlou', lastMessage: 'Merci pour les fiches !', time: '17:05' },
  { id: 3, name: 'Nour Hassan', lastMessage: 'Je rejoins la session Zoom.', time: 'Hier' },
];

const messages = [
  { from: 'Sara', content: 'Salut ! Prête pour la session IA de demain ?', time: '18:20', me: false },
  { from: 'Moi', content: "Oui, je prépare les exercices sur les réseaux de neurones.", time: '18:22', me: true },
  { from: 'Sara', content: 'Parfait, on partage l’écran ? ', time: '18:23', me: false },
];

const MessagesPage: React.FC = () => (
  <div className="grid lg:grid-cols-3 gap-4 min-h-[60vh]">
    <div className="card-surface p-4 space-y-3 lg:col-span-1">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Conversations</h2>
        <MessageCircle className="text-emerald-600" />
      </div>
      <div className="space-y-2">
        {conversations.map((conversation) => (
          <button key={conversation.id} className="w-full text-left card-surface p-3 hover:shadow transition">
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
          <p className="text-sm text-slate-500">En conversation avec</p>
          <p className="text-lg font-semibold text-slate-900">Sara Benali</p>
        </div>
        <span className="badge-soft">IA</span>
      </div>
      <div className="space-y-3">
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
      </div>
      <div className="mt-4 flex gap-2">
        <input className="flex-1" placeholder="Envoyer un message..." />
        <button className="primary-btn">Envoyer</button>
      </div>
    </div>
  </div>
);

export default MessagesPage;
