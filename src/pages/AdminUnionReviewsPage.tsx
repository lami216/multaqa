import React, { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import UnionReviewCard from '../components/UnionReviewCard';
import { useLanguage } from '../context/LanguageContext';
import { fetchAcademicSettings, createAdminUnionReview, fetchAdminUnionReviews, type AcademicSettingsResponse, type UnionReviewItem } from '../lib/http';
import { getFaculties, getLevelsByFaculty, getMajorsByFacultyAndLevel, getSubjectsByMajorAndSemester, getTermSemesterForLevel, isFacultyEnabled, type CatalogFaculty, type CatalogLevel, type CatalogMajor, type CatalogSubject } from '../lib/catalog';

type AdminUnionReviewForm = {
  organizer: 'UNEM' | 'UGEM';
  facultyId: string;
  level: string;
  majorId: string;
  subjectId: string;
  location: string;
  startsAt: string;
};

export default function AdminUnionReviewsPage() {
  const { t, language } = useLanguage();
  const [reviews, setReviews] = useState<UnionReviewItem[]>([]);
  const [academicSettings, setAcademicSettings] = useState<AcademicSettingsResponse>({
    academicTermType: 'odd',
    catalogVisibility: { faculties: {}, majors: {} },
    preregCounts: {},
    majorAvailability: {}
  });
  const [faculties, setFaculties] = useState<CatalogFaculty[]>([]);
  const [form, setForm] = useState<AdminUnionReviewForm>({ organizer: 'UNEM', facultyId: '', level: '', majorId: '', subjectId: '', location: '', startsAt: '' });

  useEffect(() => {
    void Promise.all([fetchAdminUnionReviews(), fetchAcademicSettings()]).then(([reviewsRes, settingsRes]) => {
      setReviews(reviewsRes.data.reviews ?? []);
      setAcademicSettings(settingsRes);
      setFaculties(getFaculties().filter((faculty) => isFacultyEnabled(faculty.id, settingsRes.catalogVisibility)));
    });
  }, []);

  const levels = useMemo<CatalogLevel[]>(() => getLevelsByFaculty(form.facultyId, academicSettings.catalogVisibility), [form.facultyId, academicSettings.catalogVisibility]);

  const majors = useMemo<CatalogMajor[]>(() => getMajorsByFacultyAndLevel(form.facultyId, form.level, academicSettings.catalogVisibility), [form.facultyId, form.level, academicSettings.catalogVisibility]);

  const subjects = useMemo<CatalogSubject[]>(() => {
    const semesterId = getTermSemesterForLevel(form.level, academicSettings.academicTermType);
    if (!semesterId) return [];
    return getSubjectsByMajorAndSemester(form.facultyId, form.level, form.majorId, semesterId, academicSettings.academicTermType, academicSettings.catalogVisibility);
  }, [form.facultyId, form.level, form.majorId, academicSettings.academicTermType, academicSettings.catalogVisibility]);

  return <div className='grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]'>
    <AdminSidebar />
    <div className='space-y-4'>
      <div className='card-surface p-5'>
        <h1 className='section-title'>{t.unionReviews.adminTitle}</h1>
        <div className='mt-4 grid gap-3 md:grid-cols-2'>
          <select value={form.organizer} onChange={(e) => setForm((prev) => ({ ...prev, organizer: e.target.value as 'UNEM' | 'UGEM' }))}>
            <option value='UNEM'>UNEM</option><option value='UGEM'>UGEM</option>
          </select>
          <select value={form.facultyId} onChange={(e) => setForm((prev) => ({ ...prev, facultyId: e.target.value, level: '', majorId: '', subjectId: '' }))}>
            <option value=''>{t.unionReviews.faculty}</option>{faculties.map((f) => <option key={f.id} value={f.id}>{language === 'ar' ? f.nameAr : f.nameFr}</option>)}
          </select>
          <select value={form.level} onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value, majorId: '', subjectId: '' }))} disabled={!form.facultyId}>
            <option value=''>{t.unionReviews.level}</option>{levels.map((l) => <option key={l.id} value={l.id}>{language === 'ar' ? l.nameAr : l.nameFr}</option>)}
          </select>
          <select value={form.majorId} onChange={(e) => setForm((prev) => ({ ...prev, majorId: e.target.value, subjectId: '' }))} disabled={!form.facultyId || !form.level}>
            <option value=''>{t.unionReviews.major}</option>{majors.map((m) => <option key={m.id} value={m.id}>{language === 'ar' ? m.nameAr : m.nameFr}</option>)}
          </select>
          <select value={form.subjectId} onChange={(e) => setForm((prev) => ({ ...prev, subjectId: e.target.value }))} disabled={!form.facultyId || !form.level || !form.majorId}>
            <option value=''>{t.unionReviews.subject}</option>{subjects.map((s) => <option key={s.id} value={s.id}>{language === 'ar' ? (s.nameAr || s.code) : (s.nameFr || s.code)}</option>)}
          </select>
          <input value={form.location} placeholder={t.unionReviews.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
          <input type='datetime-local' value={form.startsAt} onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))} />
        </div>
        <button className='primary-btn mt-3' onClick={async () => {
          const { data } = await createAdminUnionReview(form);
          setReviews((p) => [data.review, ...p]);
        }}>{t.unionReviews.publish}</button>
      </div>
      <div className='grid gap-3'>{reviews.map((r) => <UnionReviewCard key={r._id} review={r} onUpdate={() => { }} admin />)}</div>
    </div>
  </div>;
}
