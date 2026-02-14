import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getFaculties, buildAcademicMajorKey } from '../lib/catalog';
import {
  fetchAdminAcademicSettings,
  updateAdminAcademicSettings,
  type AcademicSettingsNode,
  type AcademicSettingsResponse
} from '../lib/http';

const AdminAcademicSettingsPage: React.FC = () => {
  const faculties = useMemo(() => getFaculties(), []);
  const [settings, setSettings] = useState<AcademicSettingsResponse | null>(null);
  const [draft, setDraft] = useState<{ currentTermType: 'odd' | 'even'; faculties: AcademicSettingsNode[] } | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchAdminAcademicSettings();
      const nextDraft = {
        currentTermType: data.settings?.currentTermType ?? data.academicTermType,
        faculties: data.settings?.faculties ?? []
      };
      setSettings(data);
      setDraft(nextDraft);
      setSavedSnapshot(JSON.stringify(nextDraft));
      setSelectedFaculty(nextDraft.faculties[0]?.facultyId ?? faculties[0]?.id ?? '');
    };
    void load();
  }, [faculties]);

  const selectedFacultyCatalog = faculties.find((faculty) => faculty.id === selectedFaculty);
  const levels = selectedFacultyCatalog?.levels ?? [];

  useEffect(() => {
    if (!levels.length) {
      setSelectedLevel('');
      return;
    }
    if (!levels.some((level) => level.id === selectedLevel)) {
      setSelectedLevel(levels[0].id);
    }
  }, [selectedFaculty, selectedLevel, levels]);

  const majorDraftLookup = useMemo(() => {
    const map = new Map<string, { status: 'active' | 'collecting'; threshold: number | null }>();
    for (const faculty of draft?.faculties ?? []) {
      for (const level of faculty.levels ?? []) {
        for (const major of level.majors ?? []) {
          map.set(buildAcademicMajorKey(faculty.facultyId, level.levelId, major.majorId), {
            status: major.status,
            threshold: major.threshold
          });
        }
      }
    }
    return map;
  }, [draft]);

  const majors = levels.find((level) => level.id === selectedLevel)?.majors ?? [];
  const isDirty = Boolean(draft) && JSON.stringify(draft) !== savedSnapshot;

  const updateMajor = (majorId: string, patch: Partial<{ status: 'active' | 'collecting'; threshold: number | null }>) => {
    if (!draft || !selectedFaculty || !selectedLevel) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const nextFaculties = [...prev.faculties];
      let faculty = nextFaculties.find((item) => item.facultyId === selectedFaculty);
      if (!faculty) {
        faculty = { facultyId: selectedFaculty, enabled: true, levels: [] };
        nextFaculties.push(faculty);
      }
      let level = faculty.levels.find((item) => item.levelId === selectedLevel);
      if (!level) {
        level = { levelId: selectedLevel, majors: [] };
        faculty.levels.push(level);
      }
      let major = level.majors.find((item) => item.majorId === majorId);
      if (!major) {
        major = { majorId, status: 'active', threshold: null };
        level.majors.push(major);
      }
      major.status = patch.status ?? major.status;
      major.threshold = major.status === 'collecting' ? Math.max(1, patch.threshold ?? major.threshold ?? 1) : null;
      return { ...prev, faculties: nextFaculties };
    });
  };

  const saveChanges = async () => {
    if (!draft || !isDirty) return;
    setSaving(true);
    try {
      await updateAdminAcademicSettings(draft);
      const { data: refreshed } = await fetchAdminAcademicSettings();
      const syncedDraft = {
        currentTermType: refreshed.settings?.currentTermType ?? refreshed.academicTermType,
        faculties: refreshed.settings?.faculties ?? []
      };
      setSettings(refreshed);
      setDraft(syncedDraft);
      setSavedSnapshot(JSON.stringify(syncedDraft));
      toast.success('Academic settings saved.');
    } catch {
      toast.error('Failed to save academic settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!draft || !settings) {
    return <div className="card-surface p-4 text-sm text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="card-surface p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="section-title">Academic Settings</h1>
          <Link className="secondary-btn" to="/admin">Statistics</Link>
        </div>
        <div className="flex gap-2">
          <button type="button" className={`secondary-btn ${draft.currentTermType === 'odd' ? 'ring-2 ring-emerald-300' : ''}`} onClick={() => setDraft((prev) => (prev ? { ...prev, currentTermType: 'odd' } : prev))} disabled={saving}>Odd term (S1/S3/S5)</button>
          <button type="button" className={`secondary-btn ${draft.currentTermType === 'even' ? 'ring-2 ring-emerald-300' : ''}`} onClick={() => setDraft((prev) => (prev ? { ...prev, currentTermType: 'even' } : prev))} disabled={saving}>Even term (S2/S4/S6)</button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-surface p-4 space-y-2">
          <h3 className="font-semibold text-slate-900">Faculties</h3>
          {faculties.map((faculty) => (
            <button key={faculty.id} type="button" className={`w-full text-left rounded-lg border px-3 py-2 ${selectedFaculty === faculty.id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`} onClick={() => setSelectedFaculty(faculty.id)}>
              {faculty.nameFr}
            </button>
          ))}
        </div>

        <div className="card-surface p-4 space-y-2">
          <h3 className="font-semibold text-slate-900">Levels</h3>
          {!selectedFaculty && <p className="text-sm text-slate-500">Select faculty first.</p>}
          {levels.map((level) => (
            <button key={level.id} type="button" className={`w-full text-left rounded-lg border px-3 py-2 ${selectedLevel === level.id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`} onClick={() => setSelectedLevel(level.id)}>
              {level.nameFr}
            </button>
          ))}
        </div>

        <div className="card-surface p-4 space-y-3">
          <h3 className="font-semibold text-slate-900">Majors</h3>
          {!selectedLevel && <p className="text-sm text-slate-500">Select level first.</p>}
          {majors.map((major) => {
            const key = buildAcademicMajorKey(selectedFaculty, selectedLevel, major.id);
            const current = majorDraftLookup.get(key) ?? { status: 'active', threshold: null };
            const registered = settings.counts?.[key] ?? settings.majorAvailability?.[key]?.registeredCount ?? 0;
            return (
              <div key={major.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <p className="font-medium text-slate-900">{major.nameFr}</p>
                <select value={current.status} onChange={(event) => updateMajor(major.id, { status: event.target.value as 'active' | 'collecting' })} className="w-full" disabled={saving}>
                  <option value="active">active</option>
                  <option value="collecting">collecting</option>
                </select>
                {current.status === 'collecting' && (
                  <input
                    type="number"
                    min={1}
                    value={current.threshold || 1}
                    onChange={(event) => updateMajor(major.id, { threshold: Number.parseInt(event.target.value, 10) || 1 })}
                    className="w-full"
                    disabled={saving}
                  />
                )}
                <p className="text-xs text-slate-500">{registered} registered</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-end gap-3">
          <button type="button" className="primary-btn" onClick={() => void saveChanges()} disabled={saving || !isDirty}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
};

export default AdminAcademicSettingsPage;
