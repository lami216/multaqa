import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const adminLinks = [
  { to: '/admin', label: 'Statistics' },
  { to: '/admin/academic-settings', label: 'Academic Settings' },
  { to: '/admin/war', label: 'War Dashboard' }
];

const AdminSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="card-surface p-4 space-y-2 h-fit">
      <h2 className="text-sm font-semibold text-slate-700">Admin</h2>
      {adminLinks.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className={`block rounded-lg border px-3 py-2 text-sm font-medium transition ${
            location.pathname === link.to
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </aside>
  );
};

export default AdminSidebar;
