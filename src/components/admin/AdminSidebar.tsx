import React from 'react';
import { BarChart3, GraduationCap, Trophy, CalendarClock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const adminLinks = [
    { to: '/admin', label: t.admin.statistics, icon: BarChart3 },
    { to: '/admin/academic-settings', label: t.admin.academicSettings, icon: GraduationCap },
    { to: '/admin/war', label: t.admin.warDashboard, icon: Trophy },
    { to: '/admin/union-reviews', label: t.admin.unionReviews, icon: CalendarClock }
  ];

  return (
    <aside className="premium-panel h-fit p-4">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">{t.admin.title}</h2>
      <nav className="space-y-2" aria-label={t.admin.title}>
        {adminLinks.map((link) => {
          const Icon = link.icon;
          const active = location.pathname === link.to;
          return (
            <Link key={link.to} to={link.to} className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold transition ${active ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
              <Icon size={16} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
