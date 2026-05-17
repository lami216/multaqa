import { CheckCircle2, Loader2, PenSquare, Sparkles } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SubjectChipsSelector from '../components/subjects/SubjectChipsSelector';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getSubjectNameByCode } from '../lib/catalog';
import { createPost, type PostActivityKey, type PostPayload, type PostRoleKey, type StudyTeamRoleKey } from '../lib/http';
import { getProfileSelectableSubjectCodes } from '../lib/profileSubjects';

const roleCopy: Record<PostRoleKey, { fr: { label: string; helper: string }; ar: { label: string; helper: string } }> = {
  need_help: {
    fr: { label: 'Besoin d’aide', helper: 'Je cherche un étudiant qui peut m’expliquer la matière.' },
    ar: { label: 'أحتاج مساعدة', helper: 'أبحث عن طالب يستطيع شرح المادة ومساعدتي.' }
  },
  can_help: {
    fr: { label: 'Je peux aider', helper: 'Je peux expliquer la matière et accompagner d’autres étudiants.' },
    ar: { label: 'أستطيع المساعدة', helper: 'أستطيع شرح المادة ومساعدة طلاب آخرين.' }
  }
};

const activityCopy: Record<PostActivityKey, { fr: { label: string; helper: string }; ar: { label: string; helper: string } }> = {
  td: {
    fr: { label: 'Travaux dirigés', helper: 'La session sera centrée sur les exercices de TD.' },
    ar: { label: 'حل TD', helper: 'ستركز الجلسة على التمارين والأعمال الموجهة.' }
  },
  archive: {
    fr: { label: 'Archives', helper: 'La session sera centrée sur les anciens sujets et corrigés.' },
    ar: { label: 'حل الأرشيف', helper: 'ستركز الجلسة على المواضيع القديمة والتصحيحات.' }
  }
};

const teamRoleCopy: Record<StudyTeamRoleKey, { fr: { label: string; helper: string }; ar: { label: string; helper: string } }> = {
  general_review: {
    fr: { label: 'Révision générale', helper: 'Groupe ouvert pour réviser les notions principales.' },
    ar: { label: 'مراجعة عامة', helper: 'فريق مفتوح لمراجعة أهم محاور المادة.' }
  },
  td: activityCopy.td,
  archive: activityCopy.archive
};

const categoryOptions: { value: PostPayload['category']; label: { fr: string; ar: string }; helper: { fr: string; ar: string } }[] = [
  { value: 'study_partner', label: { fr: 'Partenaire d’étude', ar: 'شريك دراسة' }, helper: { fr: 'Demander ou proposer une aide ciblée.', ar: 'اطلب أو اعرض مساعدة في مادة محددة.' } },
  { value: 'project_team', label: { fr: 'Groupe de travail', ar: 'فريق دراسة' }, helper: { fr: 'Former un petit groupe avec des rôles clairs.', ar: 'كوّن فريقاً صغيراً بأدوار واضحة.' } },
  { value: 'tutor_offer', label: { fr: 'Offre libre', ar: 'عرض حر' }, helper: { fr: 'Publier une annonce plus générale.', ar: 'انشر إعلاناً عاماً بتفاصيلك.' } },
];

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { language, t, isRtl } = useLanguage();
  const [form, setForm] = useState<PostPayload>({
    category: 'study_partner',
    title: '',
    description: '',
    faculty: '',
    level: undefined,
    languagePref: language === 'ar' ? 'Arabic' : 'French',
    location: 'campus',
    tags: [],
  });
  const [tagsInput, setTagsInput] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<PostPayload['postRole']>();
  const [selectedActivity, setSelectedActivity] = useState<PostPayload['postActivity']>();
  const [selectedTeamRoles, setSelectedTeamRoles] = useState<StudyTeamRoleKey[]>([]);
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [participantTargetCount, setParticipantTargetCount] = useState(3);
  const [shortDescription, setShortDescription] = useState('');
  const [subjectsLimitWarning, setSubjectsLimitWarning] = useState('');
  const [subjectsLimitHighlight, setSubjectsLimitHighlight] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const subjectsLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = t.createPost;
  const subjectOptions = useMemo(() => getProfileSelectableSubjectCodes(profile), [profile]);
  const isStudyPartner = form.category === 'study_partner';
  const isStudyTeam = form.category === 'project_team';
  const studyPartnerValid = selectedSubjects.length >= 1 && selectedSubjects.length <= 2 && Boolean(selectedRole) && Boolean(selectedActivity) && Boolean(availabilityDate);
  const studyTeamValid = selectedSubjects.length >= 1 && selectedSubjects.length <= 2 && selectedTeamRoles.length >= 1 && Boolean(availabilityDate) && participantTargetCount >= 3;
  const standardPostValid = Boolean(form.title?.trim() && form.description?.trim());
  const canSubmit = isStudyPartner ? studyPartnerValid : isStudyTeam ? studyTeamValid : standardPostValid;

  const selectedSubjectFullNames = useMemo(
    () => selectedSubjects.map((subjectCode) => ({ code: subjectCode, fullName: getSubjectNameByCode(subjectCode) || subjectCode })),
    [selectedSubjects]
  );

  const handleChange = (field: keyof PostPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSubject = (subject: string) => {
    setError('');
    setSubjectsLimitWarning('');
    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) return prev.filter((item) => item !== subject);
      if (prev.length >= 2) {
        setSubjectsLimitWarning(copy.subjectLimit);
        setSubjectsLimitHighlight(false);
        if (subjectsLimitTimeoutRef.current) clearTimeout(subjectsLimitTimeoutRef.current);
        requestAnimationFrame(() => {
          setSubjectsLimitHighlight(true);
          subjectsLimitTimeoutRef.current = setTimeout(() => setSubjectsLimitHighlight(false), 650);
        });
        return prev;
      }
      return [...prev, subject];
    });
  };

  const toggleRole = (role: PostPayload['postRole']) => role && setSelectedRole((prev) => (prev === role ? undefined : role));
  const toggleActivity = (activity: PostPayload['postActivity']) => activity && setSelectedActivity((prev) => (prev === activity ? undefined : activity));
  const toggleTeamRole = (role: StudyTeamRoleKey) => setSelectedTeamRoles((prev) => prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]);

  useEffect(() => () => {
    if (subjectsLimitTimeoutRef.current) clearTimeout(subjectsLimitTimeoutRef.current);
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    if (isStudyPartner && !studyPartnerValid) {
      setError(copy.studyPartnerValidation);
      setSaving(false);
      return;
    }

    if (isStudyTeam && !studyTeamValid) {
      setError(copy.studyTeamValidation);
      setSaving(false);
      return;
    }

    const payload: PostPayload = isStudyPartner
      ? { category: 'study_partner', subjectCodes: selectedSubjects, postRole: selectedRole, postActivity: selectedActivity, availabilityDate, description: shortDescription.trim() || undefined }
      : isStudyTeam
        ? { category: 'project_team', subjectCodes: selectedSubjects, availabilityDate, teamRoles: selectedTeamRoles, participantTargetCount, description: shortDescription.trim() || undefined }
        : { ...form, availabilityDate: availabilityDate || undefined, participantTargetCount: undefined, tags: tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean) };

    createPost(payload)
      .then(() => navigate('/posts'))
      .catch((err) => setError(err?.response?.data?.error ?? copy.submitError))
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
      <section className="premium-panel overflow-hidden">
        <div className="border-b border-slate-100 bg-white/70 p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="badge-soft w-fit"><Sparkles size={14} /> {copy.eyebrow}</p>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{copy.title}</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">{copy.subtitle}</p>
            </div>
            <Link to="/posts" className="secondary-btn">{copy.exploreCta}</Link>
          </div>
        </div>

        <form className="space-y-6 p-5 sm:p-7" onSubmit={handleSubmit}>
          <section className="space-y-3">
            <div>
              <h2 className="section-title">{copy.typeTitle}</h2>
              <p className="helper-text">{copy.typeHelp}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {categoryOptions.map((type) => {
                const selected = form.category === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('category', type.value)}
                    className={`rounded-[1.4rem] border p-4 text-start transition ${selected ? 'border-emerald-400 bg-emerald-50 text-emerald-950 ring-4 ring-emerald-100' : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'}`}
                  >
                    <p className="font-black">{type.label[language]}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{type.helper[language]}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {(isStudyPartner || isStudyTeam) ? (
            <>
              <section className="space-y-3 rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                <div>
                  <h2 className="section-title">{copy.subjectsTitle}</h2>
                  <p className="helper-text">{copy.subjectsHelp}</p>
                </div>
                <SubjectChipsSelector
                  options={subjectOptions}
                  selectedCodes={selectedSubjects}
                  selectedSubjects={selectedSubjectFullNames}
                  warning={subjectsLimitWarning}
                  highlight={subjectsLimitHighlight}
                  emptyMessage={copy.emptySubjects}
                  selectedLabel={copy.selectedSubjects}
                  onToggle={toggleSubject}
                />
              </section>

              {isStudyPartner ? (
                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-[1.5rem] border border-slate-100 bg-white p-4">
                    <h2 className="section-title">{copy.roleTitle}</h2>
                    <div className="grid gap-2">
                      {(Object.keys(roleCopy) as PostRoleKey[]).map((role) => (
                        <button key={role} type="button" onClick={() => toggleRole(role)} className={`rounded-2xl border p-4 text-start transition ${selectedRole === role ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <p className="font-black text-slate-900">{roleCopy[role][language].label}</p>
                          <p className="text-xs leading-5 text-slate-500">{roleCopy[role][language].helper}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3 rounded-[1.5rem] border border-slate-100 bg-white p-4">
                    <h2 className="section-title">{copy.activityTitle}</h2>
                    <div className="grid gap-2">
                      {(Object.keys(activityCopy) as PostActivityKey[]).map((activity) => (
                        <button key={activity} type="button" onClick={() => toggleActivity(activity)} className={`rounded-2xl border p-4 text-start transition ${selectedActivity === activity ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <p className="font-black text-slate-900">{activityCopy[activity][language].label}</p>
                          <p className="text-xs leading-5 text-slate-500">{activityCopy[activity][language].helper}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : (
                <section className="space-y-3 rounded-[1.5rem] border border-slate-100 bg-white p-4">
                  <h2 className="section-title">{copy.teamRolesTitle}</h2>
                  <div className="grid gap-2 md:grid-cols-3">
                    {(Object.keys(teamRoleCopy) as StudyTeamRoleKey[]).map((role) => (
                      <button key={role} type="button" onClick={() => toggleTeamRole(role)} className={`rounded-2xl border p-4 text-start transition ${selectedTeamRoles.includes(role) ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                        <p className="font-black text-slate-900">{teamRoleCopy[role][language].label}</p>
                        <p className="text-xs leading-5 text-slate-500">{teamRoleCopy[role][language].helper}</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="grid gap-4 md:grid-cols-2">
                {isStudyTeam ? (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">{copy.participants}</label>
                    <div className="flex items-center gap-2">
                      <button type="button" className="secondary-btn px-4" onClick={() => setParticipantTargetCount((prev) => Math.max(3, prev - 1))} disabled={participantTargetCount <= 3}>−</button>
                      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center font-black text-slate-900">{participantTargetCount}</div>
                      <button type="button" className="secondary-btn px-4" onClick={() => setParticipantTargetCount((prev) => prev + 1)}>+</button>
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{copy.availability}</label>
                  <input type="date" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} className="w-full" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">{copy.shortDescription}</label>
                  <textarea rows={4} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="w-full" placeholder={copy.shortDescriptionPlaceholder} />
                </div>
              </section>
            </>
          ) : (
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{copy.titleLabel}</label>
                <input className="w-full" value={form.title ?? ''} onChange={(e) => handleChange('title', e.target.value)} placeholder={copy.titlePlaceholder} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{copy.tags}</label>
                <input className="w-full" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder={copy.tagsPlaceholder} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">{copy.description}</label>
                <textarea rows={5} className="w-full" value={form.description ?? ''} onChange={(e) => handleChange('description', e.target.value)} placeholder={copy.descriptionPlaceholder} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{copy.language}</label>
                <div className="flex flex-wrap gap-2">
                  {(['French', 'Arabic'] as const).map((lng) => (
                    <button key={lng} type="button" onClick={() => handleChange('languagePref', lng)} className={`tab-btn ${form.languagePref === lng ? 'active' : 'border border-slate-200 bg-white'}`}>{lng === 'French' ? copy.french : copy.arabic}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{copy.availability}</label>
                <input type="date" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} className="w-full" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{copy.location}</label>
                <div className="flex flex-wrap gap-2">
                  {(['campus', 'online'] as const).map((loc) => (
                    <button key={loc} type="button" onClick={() => handleChange('location', loc)} className={`tab-btn ${form.location === loc ? 'active' : 'border border-slate-200 bg-white'}`}>{loc === 'campus' ? copy.campus : copy.online}</button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {error ? <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div> : null}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><CheckCircle2 size={14} /> {copy.footerNote}</p>
            <button type="submit" className="primary-btn min-w-48" disabled={saving || !canSubmit}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> {copy.publishing}</> : <><PenSquare size={16} /> {copy.publish}</>}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default CreatePostPage;
