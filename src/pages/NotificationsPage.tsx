import React from 'react';
import { Bell, Check, MessageCircle, UserPlus } from 'lucide-react';

const notifications = [
  { id: 1, type: 'match', title: 'Nouveau match', description: 'Omar Lahlou correspond à vos critères IA.', time: 'Il y a 5 min' },
  { id: 2, type: 'message', title: 'Nouveau message', description: 'Sara : On révise ce soir ?', time: 'Il y a 20 min' },
  { id: 3, type: 'request', title: 'Demande envoyée', description: 'Votre demande pour le groupe DataViz est en attente.', time: 'Hier' },
];

const iconMap = {
  match: UserPlus,
  message: MessageCircle,
  request: Check,
};

const NotificationsPage: React.FC = () => (
  <div className="card-surface p-5 space-y-4">
    <div className="flex items-center gap-2">
      <Bell className="text-emerald-600" />
      <h1 className="section-title">Notifications</h1>
    </div>
    <div className="space-y-3">
      {notifications.map((notification) => {
        const Icon = iconMap[notification.type as keyof typeof iconMap];
        return (
          <div key={notification.id} className="card-surface p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Icon size={18} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">{notification.title}</p>
              <p className="text-sm text-slate-600">{notification.description}</p>
              <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default NotificationsPage;
