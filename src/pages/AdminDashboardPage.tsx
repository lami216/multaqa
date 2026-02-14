import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAdminStats, type AdminEventItem, type AdminStatsResponse } from '../lib/http';

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsResponse['stats'] | null>(null);
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('');

  const loadDashboard = async (action?: string) => {
    setLoading(true);
    const { data } = await fetchAdminStats(action ? { action } : undefined);
    setStats(data.stats);
    setEvents(data.events);
    setLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const actionOptions = useMemo(
    () => [
      { value: '', label: 'Tous les évènements' },
      { value: 'post_created', label: 'Post créé' },
      { value: 'join_requested', label: 'Join demandé' },
      { value: 'join_accepted', label: 'Join accepté' },
      { value: 'join_rejected', label: 'Join rejeté' },
      { value: 'post_closed', label: 'Post clôturé' },
      { value: 'post_deleted', label: 'Post supprimé' }
    ],
    []
  );

  const handleFilterChange = async (value: string) => {
    setFilterAction(value);
    await loadDashboard(value || undefined);
  };

  return (
    <div className="space-y-4">
      <div className="card-surface p-5 flex items-center gap-3">
        <Shield className="text-emerald-600" />
        <div>
          <h1 className="section-title">Console admin</h1>
          <p className="helper-text">Vue d'ensemble sur les annonces, utilisateurs et évènements récents.</p>
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

          <div className="card-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">Évènements récents</h3>
                <p className="text-sm text-slate-500">Filtrez par type d'action.</p>
              </div>
              <select
                className="min-w-[200px]"
                value={filterAction}
                onChange={(event) => void handleFilterChange(event.target.value)}
              >
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {events.length ? (
                events.map((eventItem) => {
                  const actor = typeof eventItem.actorId === 'string' ? eventItem.actorId : eventItem.actorId?.username;
                  const postTitle = typeof eventItem.postId === 'string' ? eventItem.postId : eventItem.postId?.title;
                  return (
                    <div key={eventItem._id} className="card-surface p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{eventItem.action}</p>
                        <p className="text-xs text-slate-500">
                          {actor ? `Par ${actor}` : 'Acteur inconnu'} · {postTitle ? `Post: ${postTitle}` : 'Post non précisé'}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(eventItem.createdAt).toLocaleString()}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">Aucun évènement récent.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;
