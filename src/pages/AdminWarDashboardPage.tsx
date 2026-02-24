import React, { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import { fetchAdminWarMajors, type AdminWarMajorsResponse, type AdminWarMajorRow } from '../lib/http';

const AdminWarDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'all'>('month');
  const [payload, setPayload] = useState<AdminWarMajorsResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await fetchAdminWarMajors();
      setPayload(data);
      setLoading(false);
    };

    void load();
  }, []);

  const rows = payload?.majors ?? [];
  const summary = payload?.summary ?? {
    totalActiveMajors: rows.length,
    totalPostsThisMonth: rows.reduce((acc, item) => acc + item.monthlyPosts, 0),
    totalMatchesThisMonth: rows.reduce((acc, item) => acc + item.monthlyMatches, 0)
  };

  const rankedRows = useMemo(() => {
    const cloned = [...rows];
    if (view === 'all') {
      cloned.sort((a, b) => b.allTimeScore - a.allTimeScore);
    }
    return cloned;
  }, [rows, view]);

  const getScore = (row: AdminWarMajorRow) => (view === 'month' ? row.monthlyScore : row.allTimeScore);
  const getPosts = (row: AdminWarMajorRow) => (view === 'month' ? row.monthlyPosts : row.allTimePosts);
  const getMatches = (row: AdminWarMajorRow) => (view === 'month' ? row.monthlyMatches : row.allTimeMatches);
  const getUsers = (row: AdminWarMajorRow) => (view === 'month' ? row.monthlyUsers : row.allTimeUsers);

  return (
    <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
      <AdminSidebar />
      <div className="space-y-4">
        <div className="card-surface p-5 space-y-3">
          <h1 className="section-title">University War Dashboard</h1>
          <div className="flex gap-2">
            <button type="button" className={`secondary-btn ${view === 'month' ? 'ring-2 ring-emerald-300' : ''}`} onClick={() => setView('month')}>This Month</button>
            <button type="button" className={`secondary-btn ${view === 'all' ? 'ring-2 ring-emerald-300' : ''}`} onClick={() => setView('all')}>All Time</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-surface p-4">
            <p className="text-sm text-slate-600">Total Active Majors</p>
            <p className="text-3xl font-bold text-slate-900">{summary.totalActiveMajors}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-sm text-slate-600">Total Posts This Month</p>
            <p className="text-3xl font-bold text-slate-900">{summary.totalPostsThisMonth}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-sm text-slate-600">Total Matches This Month</p>
            <p className="text-3xl font-bold text-slate-900">{summary.totalMatchesThisMonth}</p>
          </div>
        </div>

        {loading ? (
          <div className="card-surface p-6 text-sm text-slate-600">Loading war statistics...</div>
        ) : (
          <div className="card-surface p-4 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Top 10 Leaderboard</h2>
            {rankedRows.map((row, index) => (
              <div key={String(row.majorId)} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Rank #{index + 1}</p>
                    <h3 className="text-base font-semibold text-slate-900">
                      {row.major?.nameFr || 'Unknown major'}
                      {view === 'month' && row.monthlyScore > 0 ? <span className="ms-2">🔥</span> : null}
                    </h3>
                    <p className="text-sm text-slate-500">{row.faculty?.nameFr || 'Unknown faculty'}</p>
                  </div>
                  <p className="text-3xl font-black text-emerald-700">{getScore(row)}</p>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                  <p>Posts: <span className="font-semibold text-slate-900">{getPosts(row)}</span></p>
                  <p>Matches: <span className="font-semibold text-slate-900">{getMatches(row)}</span></p>
                  <p>New Users: <span className="font-semibold text-slate-900">{getUsers(row)}</span></p>
                </div>
              </div>
            ))}
            {!rankedRows.length && <p className="text-sm text-slate-500">No war data yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWarDashboardPage;
