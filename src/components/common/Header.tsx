import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Languages, Menu, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const Header: React.FC = () => {
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  const navLinks = [
    { path: '/', label: 'Accueil' },
    { path: '/posts', label: 'Posts' },
    { path: '/messages', label: 'Messages' },
    { path: '/notifications', label: 'Notifications' },
    { path: '/profile', label: 'Profil' },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin' }] : []),
  ];

  const switchLanguage = (lang: 'ar' | 'fr') => {
    setLanguage(lang);
    setOpen(false);
  };

  const avatarUrl = profile?.avatarUrl ? `${profile.avatarUrl}?v=${new Date(profile.updatedAt ?? Date.now()).getTime()}` : undefined;
  const fallbackInitial = user?.username?.[0]?.toUpperCase();

  return (
    <header className="bg-white shadow-sm border-b border-slate-100 sticky top-0 z-20">
      <div className="container-balanced flex items-center justify-between gap-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 font-black">
            M
          </div>
          <div className="leading-tight">
            <p className="text-lg font-extrabold text-slate-900">Multaqa</p>
            <p className="text-xs text-slate-500">Find your ideal study partner</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors duration-200 ${
                location.pathname === link.path
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-700">
              <Link to="/profile" className="flex items-center gap-2">
                <Avatar className="h-9 w-9 border border-slate-200">
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                  <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold">
                    {fallbackInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{user.username}</span>
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="text-slate-600 hover:text-slate-900 font-semibold"
              >
                Se déconnecter
              </button>
            </div>
          )}
          <div className="hidden sm:flex items-center rounded-full border border-slate-200 bg-slate-50 px-1 py-1 text-xs font-semibold text-slate-700">
            <button
              type="button"
              onClick={() => switchLanguage('ar')}
              className={`px-3 py-1 rounded-full flex items-center gap-1 transition ${
                language === 'ar' ? 'bg-white shadow-sm text-emerald-700' : ''
              }`}
            >
              <Languages size={14} /> العربية
            </button>
            <button
              type="button"
              onClick={() => switchLanguage('fr')}
              className={`px-3 py-1 rounded-full transition ${
                language === 'fr' ? 'bg-white shadow-sm text-emerald-700' : ''
              }`}
            >
              Français
            </button>
          </div>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700"
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white shadow-inner">
          <div className="container-balanced py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <Languages size={16} />
              <button
                type="button"
                onClick={() => switchLanguage('ar')}
                className={`px-3 py-1 rounded-full ${
                  language === 'ar' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100'
                }`}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => switchLanguage('fr')}
                className={`px-3 py-1 rounded-full ${
                  language === 'fr' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100'
                }`}
              >
                Français
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                    location.pathname === link.path
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                      : 'border-slate-100 bg-slate-50 text-slate-700'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-slate-200">
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                  <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold">
                    {fallbackInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{user.username}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void logout();
                      setOpen(false);
                    }}
                    className="text-sm text-slate-600 font-semibold"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
