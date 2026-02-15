import React from 'react';
import { Bell, Home, MessageCircle, Shield, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../context/ConversationsContext';
import { useNotifications } from '../../context/NotificationsContext';

const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useConversations();
  const { unreadCount: unreadNotifications } = useNotifications();
  const items = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/messages', label: 'Messages', icon: MessageCircle },
    { to: '/profile', label: 'Profil', icon: User },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 bg-white border-t border-slate-200 shadow-inner md:hidden">
      <div className="flex justify-around items-center py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const unreadBadge = item.to === '/messages' ? unreadCount : item.to === '/notifications' ? unreadNotifications : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 text-xs font-semibold transition ${
                  isActive ? 'text-emerald-700' : 'text-slate-500'
                }`
              }
            >
              <span className="relative inline-flex">
                <Icon size={22} className="text-current" />
                {unreadBadge > 0 && (
                  <span className="absolute -top-1 -right-2 rounded-full bg-rose-500 text-white text-[10px] font-semibold px-1 min-w-[16px] h-4 flex items-center justify-center">
                    {unreadBadge}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
