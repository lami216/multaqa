import React from 'react';
import { Bell, Home, MessageCircle, PenSquare, Shield, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../context/ConversationsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationsContext';

const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useConversations();
  const { unreadCount: unreadNotifications } = useNotifications();
  const { t } = useLanguage();
  const items = [
    { to: '/', label: t.nav.home, icon: Home },
    { to: '/posts', label: t.nav.posts, icon: PenSquare },
    { to: '/messages', label: t.nav.messages, icon: MessageCircle },
    { to: '/profile', label: t.nav.profile, icon: User },
    { to: '/notifications', label: t.nav.notifications, icon: Bell },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: t.nav.admin, icon: Shield }] : []),
  ];

  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 rounded-[1.75rem] border border-white/70 bg-white/90 shadow-hover backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
      <div className="safe-bottom flex items-center justify-around px-2 pt-2">
        {items.map((item) => {
          const Icon = item.icon;
          const unreadBadge = item.to === '/messages' ? unreadCount : item.to === '/notifications' ? unreadNotifications : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition ${
                  isActive ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <span className="relative inline-flex">
                <Icon size={20} className="text-current" />
                {unreadBadge > 0 && (
                  <span className="absolute -end-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                    {unreadBadge}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
