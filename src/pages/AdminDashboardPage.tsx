import React, { useEffect, useState } from 'react';
import { Activity, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAdminStats, type AdminStatsResponse } from '../lib/http';

const AdminDashboardPage: React.FC = () => {
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
    <div className="space-y-4">
      <div className="card-surface p-5 flex items-center gap-3">
        <Shield className="text-emerald-600" />
        <div>
          <h1 className="section-title">Console admin</h1>
          <p className="helper-text">Vue d'ensemble sur les annonces et utilisateurs.</p>
        </div>
        <Link to="/admin/academic-settings" className="secondary-btn ms-auto">Academic Settings</Link>
      </div>

      {loading ? (
        <div className="card-surface p-6 text-sm text-slate-600">Chargement des statistiques...</div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card-surface p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Posts actifs</h3>
                <Activity className="text-emerald-600" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{stats?.activePosts ?? 0}</p>
              <p className="text-sm text-slate-500">Annonces visibles sur le fil public.</p>
            </div>
            <div className="card-surface p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Posts clôturés/matchés</h3>
                <Shield className="text-emerald-600" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{stats?.matchedOrClosedPosts ?? 0}</p>
              <p className="text-sm text-slate-500">Annonces terminées.</p>
            </div>
            <div className="card-surface p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Posts expirés</h3>
                <Activity className="text-emerald-600" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{stats?.expiredPosts ?? 0}</p>
              <p className="text-sm text-slate-500">Plus visibles sur le fil.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card-surface p-4 space-y-2">
              <h3 className="font-semibold text-slate-900">Engagement sur les posts</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Posts avec acceptation</span>
                <span className="badge-soft">{stats?.postsWithAccepted ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Posts clôturés sans acceptation</span>
                <span className="badge-soft">{stats?.closedWithoutAccepted ?? 0}</span>
              </div>
            </div>
            <div className="card-surface p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="text-emerald-600" />
                <h3 className="font-semibold text-slate-900">Utilisateurs par rôle</h3>
              </div>
              {stats?.usersByRole
                ? Object.entries(stats.usersByRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{role}</span>
                      <span className="badge-soft">{count}</span>
                    </div>
                  ))
                : <p className="text-sm text-slate-500">Aucune donnée utilisateur.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;
