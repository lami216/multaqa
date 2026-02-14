import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFaculties } from '../lib/catalog';
import {
  fetchAdminAcademicSettings,
  updateAdminAcademicSettings,
  type AcademicSettingsResponse,
  type MajorVisibilityConfig
} from '../lib/http';

const AdminAcademicSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AcademicSettingsResponse>({
    academicTermType: 'odd',
    catalogVisibility: { faculties: {}, majors: {} },
    preregCounts: {}
  });
  const [saving, setSaving] = useState(false);

  const faculties = useMemo(() => getFaculties(), []);

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchAdminAcademicSettings();
      setSettings(data);
    };
    void load();
  }, []);

  const updateSettings = async (next: AcademicSettingsResponse) => {
    setSaving(true);
    setSettings(next);
    try {
      const { data } = await updateAdminAcademicSettings({
        academicTermType: next.academicTermType,
        catalogVisibility: next.catalogVisibility
      });
      setSettings(data);
    } finally {
      setSaving(false);
    }
  };

  const setTermType = async (termType: 'odd' | 'even') => {
    await updateSettings({ ...settings, academicTermType: termType });
  };

  const toggleFaculty = async (facultyId: string, enabled: boolean) => {
    await updateSettings({
      ...settings,
      catalogVisibility: {
        ...settings.catalogVisibility,
        faculties: {
          ...settings.catalogVisibility.faculties,
          [facultyId]: enabled
        }
      }
    });
  };

  const updateMajor = async (majorId: string, patch: Partial<MajorVisibilityConfig>) => {
    const current = settings.catalogVisibility.majors?.[majorId] ?? { enabled: true, threshold: 20 };
    await updateSettings({
      ...settings,
      catalogVisibility: {
        ...settings.catalogVisibility,
        majors: {
          ...settings.catalogVisibility.majors,
          [majorId]: {
            enabled: patch.enabled ?? current.enabled,
            threshold: patch.threshold ?? current.threshold
          }
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="card-surface p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="section-title">Academic Settings</h1>
          <Link className="secondary-btn" to="/admin">Statistics</Link>
        </div>
        <div className="flex gap-2">
          <button type="button" className={`secondary-btn ${settings.academicTermType === 'odd' ? 'ring-2 ring-emerald-300' : ''}`} onClick={() => void setTermType('odd')} disabled={saving}>Odd term (S1/S3/S5)</button>
          <button type="button" className={`secondary-btn ${settings.academicTermType === 'even' ? 'ring-2 ring-emerald-300' : ''}`} onClick={() => void setTermType('even')} disabled={saving}>Even term (S2/S4/S6)</button>
        </div>
      </div>

      <div className="card-surface p-4 space-y-4">
        {faculties.map((faculty) => {
          const facultyEnabled = settings.catalogVisibility.faculties?.[faculty.id] !== false;
          return (
            <div key={faculty.id} className="rounded-xl border border-slate-200 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{faculty.nameFr}</h3>
                <label className="text-sm flex items-center gap-2">
                  <input type="checkbox" checked={facultyEnabled} onChange={(event) => void toggleFaculty(faculty.id, event.target.checked)} disabled={saving} />
                  Enabled
                </label>
              </div>
              {faculty.levels.flatMap((level) => level.majors).map((major) => {
                const majorConfig = settings.catalogVisibility.majors?.[major.id] ?? { enabled: true, threshold: 20 };
                const prereg = settings.preregCounts?.[major.id] ?? 0;
                return (
                  <div key={major.id} className="grid md:grid-cols-4 gap-2 items-center text-sm border-t border-slate-100 pt-2">
                    <span className="font-medium">{major.nameFr}</span>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={majorConfig.enabled !== false} onChange={(event) => void updateMajor(major.id, { enabled: event.target.checked })} disabled={saving || !facultyEnabled} />
                      Enabled
                    </label>
                    <label className="flex items-center gap-2">
                      Threshold
                      <input
                        type="number"
                        className="w-20"
                        min={1}
                        value={majorConfig.threshold ?? 20}
                        onChange={(event) => void updateMajor(major.id, { threshold: Number.parseInt(event.target.value, 10) || 20 })}
                        disabled={saving || !facultyEnabled}
                      />
                    </label>
                    <span>{prereg} registered</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminAcademicSettingsPage;
