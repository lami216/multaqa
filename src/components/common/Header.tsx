import React from 'react';
import { Bell, Home, Languages, Menu, MessageCircle, PenSquare, Shield, User, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationsContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const Header: React.FC = () => {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { user, profile, logout } = useAuth();
  const { unreadCount: unreadNotifications } = useNotifications();
  const [open, setOpen] = React.useState(false);

  const navLinks = [
    { path: '/', label: t.nav.home, icon: Home },
    { path: '/posts', label: t.nav.posts, icon: PenSquare },
    { path: '/messages', label: t.nav.messages, icon: MessageCircle },
    { path: '/notifications', label: t.nav.notifications, icon: Bell },
    { path: '/profile', label: t.nav.profile, icon: User },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: t.nav.admin, icon: Shield }] : []),
  ];

  const switchLanguage = (lang: 'ar' | 'fr') => {
    setLanguage(lang);
    setOpen(false);
  };

  const avatarUrl = profile?.avatarUrl ? `${profile.avatarUrl}?v=${new Date(profile.updatedAt ?? Date.now()).getTime()}` : undefined;
  const fallbackInitial = user?.username?.[0]?.toUpperCase() ?? 'M';

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="container-balanced flex items-center justify-between gap-3 py-3">
        <Link to="/" className="group flex items-center gap-3" aria-label="Multaqa home">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-emerald-700 text-lg font-black text-white shadow-card transition group-hover:scale-105">
            M
          </div>
          <div className="leading-tight">
            <p className="text-lg font-black tracking-tight text-slate-950">Multaqa</p>
            <p className="hidden text-xs font-medium text-slate-500 sm:block">Student collaboration hub</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 p-1 shadow-sm md:flex" aria-label="Primary navigation">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition-all ${
                  active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <Icon size={15} />
                {link.label}
                {link.path === '/notifications' && unreadNotifications > 0 && (
                  <span className="ms-0.5 rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">{unreadNotifications}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-full border border-slate-200 bg-white/80 p-1 text-xs font-black text-slate-600 shadow-sm sm:flex" aria-label={t.common.language}>
            <button
              type="button"
              onClick={() => switchLanguage('ar')}
              className={`rounded-full px-3 py-1.5 transition ${language === 'ar' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-slate-100'}`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => switchLanguage('fr')}
              className={`rounded-full px-3 py-1.5 transition ${language === 'fr' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-slate-100'}`}
            >
              Français
            </button>
          </div>

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/profile" className="inline-flex items-center gap-2 rounded-full bg-white/75 p-1 pe-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/70 transition hover:text-emerald-700">
                <Avatar className="h-9 w-9 border border-white shadow-sm">
                  <AvatarImage src={avatarUrl} alt={`${user.username} avatar`} />
                  <AvatarFallback className="bg-emerald-50 font-black text-emerald-700">{fallbackInitial}</AvatarFallback>
                </Avatar>
                <span className="max-w-24 truncate">{user.username}</span>
              </Link>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="rounded-2xl border border-slate-200 bg-white/85 p-2 text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
            aria-label={t.nav.menu}
            aria-expanded={open}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white/95 shadow-card md:hidden">
          <div className="container-balanced space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                      active ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    <Icon size={17} />
                    <span className="relative">
                      {link.label}
                      {link.path === '/notifications' && unreadNotifications > 0 && (
                        <span className="ms-1 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{unreadNotifications}</span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <Languages size={16} />
                <button type="button" onClick={() => switchLanguage('ar')} className={`rounded-full px-3 py-1 ${language === 'ar' ? 'bg-white text-emerald-700 shadow-sm' : ''}`}>العربية</button>
                <button type="button" onClick={() => switchLanguage('fr')} className={`rounded-full px-3 py-1 ${language === 'fr' ? 'bg-white text-emerald-700 shadow-sm' : ''}`}>Français</button>
              </div>
            </div>
            {user ? (
              <div className="flex items-center gap-3 rounded-3xl bg-slate-950 p-3 text-white">
                <Avatar className="h-11 w-11 border border-white/20">
                  <AvatarImage src={avatarUrl} alt={`${user.username} avatar`} />
                  <AvatarFallback className="bg-emerald-500 font-bold text-white">{fallbackInitial}</AvatarFallback>
                </Avatar>
                <p className="flex-1 font-bold">{user.username}</p>
                <button type="button" onClick={() => { void logout(); setOpen(false); }} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold">
                  {t.nav.signOut}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
