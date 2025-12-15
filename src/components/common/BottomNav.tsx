import React from 'react';
import { Bell, Home, MessageCircle, Shield, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const BottomNav: React.FC = () => {
  const { user } = useAuth();
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
              <Icon size={22} className="text-current" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
