import { Compass, Filter, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PostCard from '../components/PostCard';
import SubjectChipsSelector from '../components/subjects/SubjectChipsSelector';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getSubjectNameByCode } from '../lib/catalog';
import { fetchPosts, type PostPayload, type PostResponse, type PostRoleKey } from '../lib/http';
import { getProfileSelectableSubjectCodes } from '../lib/profileSubjects';

const roleCopy: Record<PostRoleKey, { fr: { label: string; helper: string }; ar: { label: string; helper: string } }> = {
  need_help: {
    fr: { label: 'Besoin d’aide', helper: 'Afficher les posts de personnes qui cherchent un accompagnement.' },
    ar: { label: 'أحتاج مساعدة', helper: 'عرض منشورات الطلاب الذين يبحثون عن مساعدة.' }
  },
  can_help: {
    fr: { label: 'Peut aider', helper: 'Afficher les posts de personnes disponibles pour aider.' },
    ar: { label: 'أستطيع المساعدة', helper: 'عرض منشورات الطلاب المتاحين للمساعدة.' }
  }
};

const categoryLabels: Record<string, { fr: string; ar: string }> = {
  study_partner: { fr: 'Partenaire d’étude', ar: 'شريك دراسة' },
  project_team: { fr: 'Groupe de travail', ar: 'فريق دراسة' },
  tutor_offer: { fr: 'Offre libre', ar: 'عرض حر' }
};

const toRole = (post: PostResponse): PostPayload['postRole'] | undefined => {
  if (post.postRole === 'need_help' || post.postRole === 'can_help') return post.postRole;
  const legacyRole = (post as PostResponse & { studentRole?: string }).studentRole;
  if (legacyRole === 'helper') return 'can_help';
  if (legacyRole === 'learner') return 'need_help';
  return undefined;
};

const PostsFeedPage: React.FC = () => {
  const { language, t, isRtl } = useLanguage();
  const copy = t.explore;
  const [category, setCategory] = useState('');
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [hiddenMatchedIds, setHiddenMatchedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersReady, setFiltersReady] = useState(false);
  const { currentUserId, profile, user, loading: authLoading } = useAuth();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<PostPayload['postRole'][]>([]);
  const [subjectsLimitWarning, setSubjectsLimitWarning] = useState('');
  const [subjectsLimitHighlight, setSubjectsLimitHighlight] = useState(false);
  const [rolesLimitWarning, setRolesLimitWarning] = useState('');
  const [broaderResults, setBroaderResults] = useState(false);
  const didSetDefaultsRef = useRef(false);
  const subjectsLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('matchedPostsHidden');
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      setHiddenMatchedIds(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.warn('[PostsFeedPage] Failed to parse hidden posts cache.', error);
      setHiddenMatchedIds([]);
    }
  }, []);

  const subjectOptions = useMemo(() => getProfileSelectableSubjectCodes(profile), [profile]);
  const importantSubjectCodes = useMemo(() => (profile?.subjectsSettings ?? []).filter((item) => item.isPriority).map((item) => item.subjectCode), [profile?.subjectsSettings]);
  const selectedSubjectFullNames = useMemo(
    () => selectedSubjects.map((subjectCode) => ({ code: subjectCode, fullName: getSubjectNameByCode(subjectCode) || subjectCode })),
    [selectedSubjects]
  );

  useEffect(() => {
    if (didSetDefaultsRef.current) return;
    if (!subjectOptions.length) {
      didSetDefaultsRef.current = true;
      setFiltersReady(true);
      return;
    }
    if (selectedSubjects.length === 0) {
      setSelectedSubjects(subjectOptions.slice(0, 2));
      return;
    }
    didSetDefaultsRef.current = true;
    setFiltersReady(true);
  }, [subjectOptions, selectedSubjects.length]);

  useEffect(() => {
    if (authLoading || !filtersReady) return;
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (category) params.category = category;
        if (selectedSubjects.length) params.selectedSubjects = selectedSubjects.join(',');
        params.broader = broaderResults ? 'true' : 'false';
        const { data } = await fetchPosts(params);
        setPosts(Array.isArray(data?.posts) ? data.posts : []);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [category, selectedSubjects, broaderResults, user, authLoading, filtersReady]);

  useEffect(() => () => {
    if (subjectsLimitTimeoutRef.current) clearTimeout(subjectsLimitTimeoutRef.current);
  }, []);

  const toggleSubject = (subject: string) => {
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

  const toggleRole = (role: PostPayload['postRole']) => {
    if (!role) return;
    setRolesLimitWarning('');
    setSelectedRoles((prev) => {
      if (prev.includes(role)) return prev.filter((item) => item !== role);
      if (prev.length >= 2) return prev;
      const isConflict = (role === 'need_help' && prev.includes('can_help')) || (role === 'can_help' && prev.includes('need_help'));
      if (isConflict) {
        setRolesLimitWarning(copy.roleConflict);
        return prev;
      }
      return [...prev, role];
    });
  };

  const filtered = useMemo(() => (posts ?? [])
    .filter((post) => !hiddenMatchedIds.includes(post._id))
    .filter((post) => !selectedRoles.length || Boolean(toRole(post) && selectedRoles.includes(toRole(post)))),
    [posts, hiddenMatchedIds, selectedRoles]
  );

  if (authLoading) {
    return <div className="card-surface p-6 text-sm text-slate-600"><Loader2 className="me-2 inline animate-spin" size={16} />{copy.loading}</div>;
  }

  if (!user) {
    return (
      <div className="premium-panel p-6 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <h2 className="section-title">{copy.loginTitle}</h2>
        <p className="text-sm text-slate-600">{copy.loginDescription}</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/login" className="primary-btn">{copy.login}</Link>
          <Link to="/signup" className="secondary-btn">{copy.signup}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
      <section className="premium-panel overflow-hidden">
        <div className="border-b border-slate-100 bg-white/75 p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="badge-soft w-fit"><Compass size={14} /> {copy.eyebrow}</p>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{copy.title}</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">{copy.subtitle}</p>
            </div>
            <Link to="/posts/new" className="secondary-btn">{copy.createCta}</Link>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Search size={18} className="text-emerald-700" />
                <div>
                  <h2 className="section-title">{copy.subjectsTitle}</h2>
                  <p className="helper-text">{copy.subjectsHelp}</p>
                </div>
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-[1.5rem] border border-slate-100 bg-white p-4">
                <h2 className="section-title">{copy.roleTitle}</h2>
                {rolesLimitWarning ? <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{rolesLimitWarning}</p> : null}
                {(Object.keys(roleCopy) as PostRoleKey[]).map((role) => (
                  <button key={role} type="button" onClick={() => toggleRole(role)} className={`w-full rounded-2xl border p-4 text-start transition ${selectedRoles.includes(role) ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <p className="font-black text-slate-900">{roleCopy[role][language].label}</p>
                    <p className="text-xs leading-5 text-slate-500">{roleCopy[role][language].helper}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-3 rounded-[1.5rem] border border-slate-100 bg-white p-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-emerald-700" />
                  <h2 className="section-title">{copy.filtersTitle}</h2>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{copy.category}</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
                    <option value="">{copy.allCategories}</option>
                    {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label[language]}</option>)}
                  </select>
                </div>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-600" checked={broaderResults} onChange={(e) => setBroaderResults(e.target.checked)} />
                  <span><span className="block font-bold text-slate-800">{copy.broader}</span><span className="text-xs leading-5 text-slate-500">{copy.broaderHelp}</span></span>
                </label>
              </div>
            </div>
          </div>

          <aside className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5 text-emerald-950">
            <p className="text-sm font-bold text-emerald-700">{copy.resultsLabel}</p>
            <p className="mt-2 text-4xl font-black">{filtered.length}</p>
            <p className="mt-2 text-sm leading-6 text-emerald-900/80">{copy.resultsHelp}</p>
          </aside>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="card-surface p-6 text-sm text-slate-600"><Loader2 className="me-2 inline animate-spin" size={16} />{copy.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="premium-panel p-8 text-center">
            <Filter className="mx-auto mb-3 text-emerald-600" />
            <h2 className="section-title">{copy.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-600">{copy.emptyDescription}</p>
            <Link to="/posts/new" className="primary-btn mt-4">{copy.createCta}</Link>
          </div>
        ) : (
          filtered.map((post) => <PostCard key={post._id} post={post} currentUserId={currentUserId} />)
        )}
      </section>
    </div>
  );
};

export default PostsFeedPage;
