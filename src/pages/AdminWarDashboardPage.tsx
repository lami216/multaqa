import React, { useEffect, useState } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import { fetchAdminWarMajors, type AdminWarMajorsResponse } from '../lib/http';
import { useLanguage } from '../context/LanguageContext';

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
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'month' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payload, setPayload] = useState<AdminWarMajorsResponse | null>(null);

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
          <h1 className="section-title">{t.admin.warDashboard}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600" htmlFor="war-month-picker">{t.admin.month}</label>
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
                <option key={monthKey} value={monthKey}>{`${t.admin.month}: ${monthKey}`}</option>
              ))}
            </select>
            <button type="button" className={`secondary-btn ${mode === 'all' ? 'ring-2 ring-emerald-300' : ''}`} onClick={() => setMode('all')}>{t.admin.allTime}</button>
          </div>
        </div>

        <div className="card-surface p-4 space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">{t.admin.leaderboard}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pe-3">#</th>
                  <th className="py-2 pe-3">{t.admin.major}</th>
                  <th className="py-2 pe-3">{t.admin.faculty}</th>
                  <th className="py-2 pe-3">{t.admin.members}</th>
                  <th className="py-2 pe-3">{t.admin.posts}</th>
                  <th className="py-2 pe-3">{t.admin.matches}</th>
                  <th className="py-2 pe-3">{t.admin.score}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-3 text-sm text-slate-600" colSpan={7}>{t.admin.loadingWar}</td>
                  </tr>
                ) : top10.length ? (
                  top10.map((row) => (
                    <tr key={`${row.majorId}-${row.rank}`} className={`border-b last:border-b-0 ${row.rank <= 3 ? 'bg-emerald-50/60' : ''}`}>
                      <td className="py-2 pe-3">{row.rank}</td>
                      <td className="py-2 pe-3">{language === 'ar' ? (row.majorNameAr || row.majorNameFr || t.admin.unknownMajor) : (row.majorNameFr || row.majorNameAr || t.admin.unknownMajor)}</td>
                      <td className="py-2 pe-3">{language === 'ar' ? (row.facultyNameAr || row.facultyNameFr || t.admin.unknownFaculty) : (row.facultyNameFr || row.facultyNameAr || t.admin.unknownFaculty)}</td>
                      <td className="py-2 pe-3">{row.membersCount}</td>
                      <td className="py-2 pe-3">{row.postsCount}</td>
                      <td className="py-2 pe-3">{row.matchesCount}</td>
                      <td className="py-2 pe-3 font-bold text-emerald-700">{row.score}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 text-sm text-slate-500" colSpan={7}>{t.admin.noWarData}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-surface p-4 space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">{t.admin.platformKpi}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500 align-top">
                  <th className="py-2 pe-3">
                    <p className="font-semibold text-slate-700">TAM</p>
                    <p className="text-xs font-normal text-slate-500">{t.admin.activePosts}</p>
                  </th>
                  <th className="py-2 pe-3">
                    <p className="font-semibold text-slate-700">TP</p>
                    <p className="text-xs font-normal text-slate-500">{t.admin.posts}</p>
                  </th>
                  <th className="py-2 pe-3">
                    <p className="font-semibold text-slate-700">TPTM</p>
                    <p className="text-xs font-normal text-slate-500">{t.admin.posts}</p>
                  </th>
                  <th className="py-2 pe-3">
                    <p className="font-semibold text-slate-700">TMTM</p>
                    <p className="text-xs font-normal text-slate-500">{t.admin.matches}</p>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-3 text-sm text-slate-600" colSpan={4}>{t.admin.loadingWar}</td>
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
                    <td className="py-3 text-sm text-slate-500" colSpan={4}>{t.admin.noWarData}</td>
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
