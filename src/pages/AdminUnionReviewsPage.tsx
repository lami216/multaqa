import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import AdminSidebar from '../components/admin/AdminSidebar';
import UnionReviewCard from '../components/UnionReviewCard';
import { useLanguage } from '../context/LanguageContext';
import { fetchAcademicSettings, createUnionReview, fetchAdminUnionReviews, type AcademicSettingsResponse, type UnionReviewItem } from '../lib/http';
import { getFaculties, getLevelsByFaculty, getMajorsByFacultyAndLevel, getSubjectsByMajorAndSemester, getTermSemesterForLevel, isFacultyEnabled, type CatalogFaculty, type CatalogLevel, type CatalogMajor, type CatalogSubject } from '../lib/catalog';

type AdminUnionReviewForm = {
  organizer: 'UNEM' | 'UGEM';
  facultyId: string;
  level: string;
  majorId: string;
  selectedSubjectValue: string;
  selectedSubject: Pick<CatalogSubject, 'id' | 'code' | 'nameAr' | 'nameFr'> | null;
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
  const [form, setForm] = useState<AdminUnionReviewForm>({ organizer: 'UNEM', facultyId: '', level: '', majorId: '', selectedSubjectValue: '', selectedSubject: null, location: '', startsAt: '' });
  const [publishing, setPublishing] = useState(false);

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

  const refreshReviews = async () => {
    const reviewsRes = await fetchAdminUnionReviews();
    setReviews(reviewsRes.data.reviews ?? []);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.organizer || !form.facultyId || !form.level || !form.majorId || !form.selectedSubjectValue || !form.location.trim() || !form.startsAt) {
      toast.error(language === 'ar' ? 'أكمل كل الحقول المطلوبة قبل النشر' : 'Complétez tous les champs requis avant la publication');
      return;
    }

    const selectedSubject = subjects.find((subject) => subject.code === form.selectedSubjectValue) ?? form.selectedSubject;

    if (!selectedSubject?.code) {
      toast.error(language === 'ar' ? 'اختيار المادة غير صالح' : 'Sélection de matière invalide');
      return;
    }

    const payload = {
      organizer: form.organizer,
      facultyId: form.facultyId,
      level: form.level,
      majorId: form.majorId,
      subjectCode: selectedSubject.code,
      subjectNameAr: selectedSubject.nameAr,
      subjectNameFr: selectedSubject.nameFr,
      location: form.location.trim(),
      startsAt: form.startsAt
    };

    try {
      setPublishing(true);
      const response = await createUnionReview(payload);
      console.log('[UnionReview] created', response.data);
      toast.success(language === 'ar' ? 'تم نشر مراجعة الإتحادات بنجاح' : 'La révision de l’union a été publiée avec succès');
      setForm({ organizer: 'UNEM', facultyId: '', level: '', majorId: '', selectedSubjectValue: '', selectedSubject: null, location: '', startsAt: '' });
      await refreshReviews();
    } catch (error) {
      console.error('[UnionReview] create failed', (error instanceof AxiosError ? error.response?.data : undefined) || error);
      const apiMessage = error instanceof AxiosError ? error.response?.data?.error : undefined;
      toast.error(apiMessage || (language === 'ar' ? 'فشل نشر مراجعة الإتحادات' : 'Échec de la publication de la révision de l’union'));
    } finally {
      setPublishing(false);
    }
  };

  return <div className='grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]'>
    <AdminSidebar />
    <div className='space-y-4'>
      <form className='card-surface p-5' onSubmit={(e) => { void handleSubmit(e); }}>
        <h1 className='section-title'>{t.unionReviews.adminTitle}</h1>
        <div className='mt-4 grid gap-3 md:grid-cols-2'>
          <select value={form.organizer} onChange={(e) => setForm((prev) => ({ ...prev, organizer: e.target.value as 'UNEM' | 'UGEM' }))}>
            <option value='UNEM'>UNEM</option><option value='UGEM'>UGEM</option>
          </select>
          <select value={form.facultyId} onChange={(e) => setForm((prev) => ({ ...prev, facultyId: e.target.value, level: '', majorId: '', selectedSubjectValue: '', selectedSubject: null }))}>
            <option value=''>{t.unionReviews.faculty}</option>{faculties.map((f) => <option key={f.id} value={f.id}>{language === 'ar' ? f.nameAr : f.nameFr}</option>)}
          </select>
          <select value={form.level} onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value, majorId: '', selectedSubjectValue: '', selectedSubject: null }))} disabled={!form.facultyId}>
            <option value=''>{t.unionReviews.level}</option>{levels.map((l) => <option key={l.id} value={l.id}>{language === 'ar' ? l.nameAr : l.nameFr}</option>)}
          </select>
          <select value={form.majorId} onChange={(e) => setForm((prev) => ({ ...prev, majorId: e.target.value, selectedSubjectValue: '', selectedSubject: null }))} disabled={!form.facultyId || !form.level}>
            <option value=''>{t.unionReviews.major}</option>{majors.map((m) => <option key={m.id} value={m.id}>{language === 'ar' ? m.nameAr : m.nameFr}</option>)}
          </select>
          <select value={form.selectedSubjectValue} onChange={(e) => setForm((prev) => {
            const value = e.target.value;
            const selected = subjects.find((subject) => subject.code === value) ?? null;
            return {
              ...prev,
              selectedSubjectValue: value,
              selectedSubject: selected
                ? {
                  id: selected.id,
                  code: selected.code,
                  nameAr: selected.nameAr,
                  nameFr: selected.nameFr
                }
                : null
            };
          })} disabled={!form.facultyId || !form.level || !form.majorId}>
            <option value=''>{t.unionReviews.subject}</option>{subjects.map((s) => (
              <option key={s.id} value={s.code}>{language === 'ar' ? (s.nameAr || s.code) : (s.nameFr || s.code)}</option>
            ))}
          </select>
          <input value={form.location} placeholder={t.unionReviews.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
          <div className='rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900'>
            <div className='mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-200'>
              <CalendarClock size={16} className='shrink-0' />
              <span className='text-sm font-semibold'>
                {language === 'ar' ? 'مراجعة الإتحادات' : 'Révisions des unions'}
              </span>
            </div>
            <input
              className='w-full'
              type='datetime-local'
              value={form.startsAt}
              onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
            />
          </div>
        </div>
        <button type='submit' className='primary-btn mt-3' disabled={publishing}>{publishing ? (language === 'ar' ? 'جاري النشر...' : 'Publication...') : t.unionReviews.publish}</button>
      </form>
      <div className='grid gap-3'>{reviews.map((r) => <UnionReviewCard key={r._id} review={r} onUpdate={() => { }} admin />)}</div>
    </div>
  </div>;
}
