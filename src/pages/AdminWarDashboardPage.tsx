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
          <div className="flex flex-wrap items-center gap-2">
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
            <button type="button" className={`secondary-btn ${mode === 'all' ? 'ring-2 ring-emerald-300' : ''}`} onClick={() => setMode('all')}>All Time</button>
          </div>
        </div>

        <div className="card-surface p-4 space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Top 10 Leaderboard</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
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
                {loading ? (
                  <tr>
                    <td className="py-3 text-sm text-slate-600" colSpan={7}>Loading war statistics...</td>
                  </tr>
                ) : top10.length ? (
                  top10.map((row) => (
                    <tr key={`${row.majorId}-${row.rank}`} className={`border-b last:border-b-0 ${row.rank <= 3 ? 'bg-emerald-50/60' : ''}`}>
                      <td className="py-2 pe-3">{row.rank}</td>
                      <td className="py-2 pe-3">{uiLanguage === 'ar' ? (row.majorNameAr || row.majorNameFr || 'Unknown major') : (row.majorNameFr || row.majorNameAr || 'Unknown major')}</td>
                      <td className="py-2 pe-3">{uiLanguage === 'ar' ? (row.facultyNameAr || row.facultyNameFr || 'Unknown faculty') : (row.facultyNameFr || row.facultyNameAr || 'Unknown faculty')}</td>
                      <td className="py-2 pe-3">{row.membersCount}</td>
                      <td className="py-2 pe-3">{row.postsCount}</td>
                      <td className="py-2 pe-3">{row.matchesCount}</td>
                      <td className="py-2 pe-3 font-bold text-emerald-700">{row.score}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 text-sm text-slate-500" colSpan={7}>No war data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-surface p-4 space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Platform KPI</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500 align-top">
                  <th className="py-2 pe-3">
                    <p className="font-semibold text-slate-700">TAM</p>
                    <p className="text-xs font-normal text-slate-500">Total Active Majors</p>
                  </th>
                  <th className="py-2 pe-3">
                    <p className="font-semibold text-slate-700">TP</p>
                    <p className="text-xs font-normal text-slate-500">Total Posts</p>
                  </th>
                  <th className="py-2 pe-3">
                    <p className="font-semibold text-slate-700">TPTM</p>
                    <p className="text-xs font-normal text-slate-500">Total Posts This Month</p>
                  </th>
                  <th className="py-2 pe-3">
                    <p className="font-semibold text-slate-700">TMTM</p>
                    <p className="text-xs font-normal text-slate-500">Total Matches This Month</p>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-3 text-sm text-slate-600" colSpan={4}>Loading war statistics...</td>
                  </tr>
                ) : top10.length || Object.values(kpis).some((value) => value > 0) ? (
                  <tr>
                    <td className="py-2 pe-3 font-semibold text-slate-900">{kpis.TAM}</td>
                    <td className="py-2 pe-3 font-semibold text-slate-900">{kpis.TP}</td>
                    <td className="py-2 pe-3 font-semibold text-slate-900">{kpis.TPTM}</td>
                    <td className="py-2 pe-3 font-semibold text-slate-900">{kpis.TMTM}</td>
                  </tr>
                ) : (
                  <tr>
                    <td className="py-3 text-sm text-slate-500" colSpan={4}>No war data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWarDashboardPage;
