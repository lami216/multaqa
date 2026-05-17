import React, { useEffect, useState } from 'react';
import { Activity, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAdminStats, type AdminStatsResponse } from '../lib/http';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useLanguage } from '../context/LanguageContext';

const AdminDashboardPage: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminStatsResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    const { data } = await fetchAdminStats();
    setStats(data.stats);
    setLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);


  return (
    <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
      <AdminSidebar />
      <div className="space-y-4">
      <div className="card-surface p-5 flex items-center gap-3">
        <Shield className="text-emerald-600" />
        <div>
          <h1 className="section-title">{t.admin.consoleTitle}</h1>
          <p className="helper-text">{t.admin.consoleSubtitle}</p>
        </div>
        <Link to="/admin/academic-settings" className="secondary-btn ms-auto">{t.admin.academicSettings}</Link>
      </div>

      {loading ? (
        <div className="card-surface p-6 text-sm text-slate-600">{t.admin.loadingStats}</div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card-surface p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{t.admin.activePosts}</h3>
                <Activity className="text-emerald-600" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{stats?.activePosts ?? 0}</p>
              <p className="text-sm text-slate-500">{t.admin.activePostsHelp}</p>
            </div>
            <div className="card-surface p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{t.admin.matchedPosts}</h3>
                <Shield className="text-emerald-600" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{stats?.matchedOrClosedPosts ?? 0}</p>
              <p className="text-sm text-slate-500">{t.admin.matchedPostsHelp}</p>
            </div>
            <div className="card-surface p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{t.admin.expiredPosts}</h3>
                <Activity className="text-emerald-600" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{stats?.expiredPosts ?? 0}</p>
              <p className="text-sm text-slate-500">{t.admin.expiredPostsHelp}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card-surface p-4 space-y-2">
              <h3 className="font-semibold text-slate-900">{t.admin.engagement}</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{t.admin.postsWithAccepted}</span>
                <span className="badge-soft">{stats?.postsWithAccepted ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{t.admin.closedWithoutAccepted}</span>
                <span className="badge-soft">{stats?.closedWithoutAccepted ?? 0}</span>
              </div>
            </div>
            <div className="card-surface p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="text-emerald-600" />
                <h3 className="font-semibold text-slate-900">{t.admin.usersByRole}</h3>
              </div>
              {stats?.usersByRole
                ? Object.entries(stats.usersByRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{role}</span>
                      <span className="badge-soft">{count}</span>
                    </div>
                  ))
                : <p className="text-sm text-slate-500">{t.admin.noUserData}</p>}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
