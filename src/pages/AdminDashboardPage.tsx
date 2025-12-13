import React from 'react';
import { Ban, CheckCircle, Shield } from 'lucide-react';

const reportedUsers = [
  { id: 1, name: 'User 1', reason: 'Spam', action: 'En attente' },
  { id: 2, name: 'User 2', reason: 'Comportement inapproprié', action: 'En attente' },
];

const reportedPosts = [
  { id: 1, title: 'Demande suspecte', reason: 'Langage offensant', action: 'En attente' },
  { id: 2, title: 'Spam de liens', reason: 'Liens externes répétitifs', action: 'En attente' },
];

const AdminDashboardPage: React.FC = () => (
  <div className="space-y-4">
    <div className="card-surface p-5 flex items-center gap-3">
      <Shield className="text-emerald-600" />
      <div>
        <h1 className="section-title">Console admin</h1>
        <p className="helper-text">Surveillez les signalements et prenez des actions rapides.</p>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <div className="card-surface p-4 space-y-3">
        <h3 className="font-semibold text-slate-900">Utilisateurs signalés</h3>
        {reportedUsers.map((user) => (
          <div key={user.id} className="card-surface p-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{user.name}</p>
              <p className="text-sm text-slate-600">{user.reason}</p>
              <p className="text-xs text-slate-400">Statut : {user.action}</p>
            </div>
            <div className="flex gap-2">
              <button className="secondary-btn">
                <CheckCircle size={16} className="me-1" /> Résoudre
              </button>
              <button className="primary-btn bg-rose-600 hover:bg-rose-700">
                <Ban size={16} className="me-1" /> Bannir
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="card-surface p-4 space-y-3">
        <h3 className="font-semibold text-slate-900">Posts signalés</h3>
        {reportedPosts.map((post) => (
          <div key={post.id} className="card-surface p-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{post.title}</p>
              <p className="text-sm text-slate-600">{post.reason}</p>
              <p className="text-xs text-slate-400">Statut : {post.action}</p>
            </div>
            <div className="flex gap-2">
              <button className="secondary-btn">
                <CheckCircle size={16} className="me-1" /> Résoudre
              </button>
              <button className="primary-btn bg-rose-600 hover:bg-rose-700">
                <Ban size={16} className="me-1" /> Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default AdminDashboardPage;
