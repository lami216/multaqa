import React, { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import { fetchAdminWarMajors, type AdminWarMajorsResponse } from '../lib/http';

const buildMonthOptions = () => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const options: string[] = [];

  for (const year of years) {
    for (let month = 12; month >= 1; month -= 1) {
      const monthValue = String(month).padStart(2, '0');
      options.push(`${year}-${monthValue}`);
    }
  }

  return options;
};

const monthOptions = buildMonthOptions();

const AdminWarDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'month' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payload, setPayload] = useState<AdminWarMajorsResponse | null>(null);
  const uiLanguage = useMemo(() => (document.documentElement.lang?.toLowerCase().startsWith('ar') ? 'ar' : 'fr'), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = mode === 'all' ? { mode: 'all' as const } : { month: selectedMonth };
      const { data } = await fetchAdminWarMajors(params);
      setPayload(data);
      setLoading(false);
    };

    void load();
  }, [mode, selectedMonth]);

  const kpis = payload?.kpis ?? { TAM: 0, TP: 0, TPTM: 0, TMTM: 0 };
  const top10 = payload?.top10 ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
      <AdminSidebar />
      <div className="space-y-4">
        <div className="card-surface p-5 space-y-3">
          <h1 className="section-title">University War Dashboard</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" className={`secondary-btn ${mode === 'all' ? 'ring-2 ring-emerald-300' : ''}`} onClick={() => setMode('all')}>All Time</button>
            <label className="text-sm text-slate-600" htmlFor="war-month-picker">Month:</label>
            <select
              id="war-month-picker"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={selectedMonth}
              onChange={(event) => {
                setSelectedMonth(event.target.value);
                setMode('month');
              }}
            >
              {monthOptions.map((monthKey) => (
                <option key={monthKey} value={monthKey}>{`Month: ${monthKey}`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-surface p-3">
            <p className="text-xs uppercase text-slate-500" title="Total Active Majors">TAM</p>
            <p className="text-2xl font-bold">{kpis.TAM}</p>
            <p className="text-xs text-slate-500">Total active majors</p>
          </div>
          <div className="card-surface p-3">
            <p className="text-xs uppercase text-slate-500" title="Total Posts (all-time)">TP</p>
            <p className="text-2xl font-bold">{kpis.TP}</p>
            <p className="text-xs text-slate-500">Total posts</p>
          </div>
          <div className="card-surface p-3">
            <p className="text-xs uppercase text-slate-500" title="Total Posts This Month">TPTM</p>
            <p className="text-2xl font-bold">{kpis.TPTM}</p>
            <p className="text-xs text-slate-500">Posts in selected month</p>
          </div>
          <div className="card-surface p-3">
            <p className="text-xs uppercase text-slate-500" title="Total Matches This Month">TMTM</p>
            <p className="text-2xl font-bold">{kpis.TMTM}</p>
            <p className="text-xs text-slate-500">Matches in selected month</p>
          </div>
        </div>

        {loading ? (
          <div className="card-surface p-6 text-sm text-slate-600">Loading war statistics...</div>
        ) : (
          <div className="card-surface p-4 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Top 10 Leaderboard</h2>
            {top10.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2 pe-3">#</th>
                      <th className="py-2 pe-3">Major</th>
                      <th className="py-2 pe-3">Faculty</th>
                      <th className="py-2 pe-3">Members</th>
                      <th className="py-2 pe-3">Posts</th>
                      <th className="py-2 pe-3">Matches</th>
                      <th className="py-2 pe-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10.map((row) => (
                      <tr key={`${row.majorId}-${row.rank}`} className="border-b last:border-b-0">
                        <td className="py-2 pe-3">{row.rank}</td>
                        <td className="py-2 pe-3">{uiLanguage === 'ar' ? (row.majorNameAr || row.majorNameFr || 'Unknown major') : (row.majorNameFr || row.majorNameAr || 'Unknown major')}</td>
                        <td className="py-2 pe-3">{uiLanguage === 'ar' ? (row.facultyNameAr || row.facultyNameFr || 'Unknown faculty') : (row.facultyNameFr || row.facultyNameAr || 'Unknown faculty')}</td>
                        <td className="py-2 pe-3">{row.membersCount}</td>
                        <td className="py-2 pe-3">{row.postsCount}</td>
                        <td className="py-2 pe-3">{row.matchesCount}</td>
                        <td className="py-2 pe-3 font-bold text-emerald-700">{row.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-500">No war data yet.</p>
                <p className="text-xs text-slate-400">Create posts to generate activity.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWarDashboardPage;
