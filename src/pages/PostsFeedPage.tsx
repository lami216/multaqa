import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchPosts, type PostPayload, type PostResponse } from '../lib/http';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { PRIORITY_ROLE_OPTIONS } from '../lib/priorities';
import { getSubjectNameByCode, getSubjectShortNameByCode } from '../lib/catalog';

const toRole = (post: PostResponse): PostPayload['postRole'] | undefined => {
  if (post.postRole) return post.postRole;
  const legacyRole = (post as PostResponse & { studentRole?: string }).studentRole;
  if (legacyRole === 'helper') return 'can_help';
  if (legacyRole === 'learner') return 'need_help';
  if (legacyRole === 'partner') return 'td';
  return undefined;
};

const PostsFeedPage: React.FC = () => {
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

  const subjectOptions = useMemo(() => profile?.subjectCodes?.filter(Boolean) ?? [], [profile?.subjectCodes]);

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
    if (authLoading) return;
    if (!filtersReady) return;
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
        const nextPosts = Array.isArray(data?.posts) ? data.posts : [];
        setPosts(nextPosts);
      } catch (error) {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [category, selectedSubjects, broaderResults, user, authLoading, filtersReady]);

  useEffect(() => () => {
    if (subjectsLimitTimeoutRef.current) {
      clearTimeout(subjectsLimitTimeoutRef.current);
    }
  }, []);

  const toggleSubject = (subject: string) => {
    setSubjectsLimitWarning('');
    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) {
        return prev.filter((item) => item !== subject);
      }
      if (prev.length >= 2) {
        setSubjectsLimitWarning('Vous pouvez sélectionner deux matières maximum.');
        setSubjectsLimitHighlight(false);
        if (subjectsLimitTimeoutRef.current) {
          clearTimeout(subjectsLimitTimeoutRef.current);
        }
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
      if (prev.includes(role)) {
        return prev.filter((item) => item !== role);
      }

      if (prev.length >= 2) {
        return prev;
      }

      const isConflict =
        (role === 'need_help' && prev.includes('can_help')) ||
        (role === 'can_help' && prev.includes('need_help'));

      if (isConflict) {
        setRolesLimitWarning('لا يمكن الجمع بين محتاج مساعدة وأقدر أساعد');
        return prev;
      }

      return [...prev, role];
    });
  };

  const filtered = useMemo(() => {
    return (posts ?? [])
      .filter((post) => !hiddenMatchedIds.includes(post._id))
      .filter((post) => {
        if (!selectedRoles.length) return true;
        const postRole = toRole(post);
        return Boolean(postRole && selectedRoles.includes(postRole));
      });
  }, [posts, hiddenMatchedIds, selectedRoles]);

  if (authLoading) {
    return <div className="card-surface p-6 text-sm text-slate-600">Chargement...</div>;
  }

  if (!user) {
    return (
      <div className="card-surface p-6 space-y-3">
        <h2 className="section-title">Connectez-vous pour voir les annonces</h2>
        <p className="text-sm text-slate-600">
          Veuillez vous connecter ou créer un compte pour accéder au fil des posts.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/login" className="primary-btn">Connexion</Link>
          <Link to="/signup" className="secondary-btn">Créer un compte</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-surface p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-600">Filtrer les posts</p>
            <h2 className="section-title">Fil d'opportunités</h2>
          </div>
          <Filter className="text-emerald-600" />
        </div>
        <div className="space-y-4">
          {selectedSubjectFullNames.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">Selected subjects:</p>
              <ul className="list-disc ps-5 text-sm text-slate-600 space-y-1">
                {selectedSubjectFullNames.map((subject) => (
                  <li key={subject.code}>{subject.fullName}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-slate-700">الدور</p>
              <p className="helper-text">اختر حتى دورين.</p>
            </div>
            {rolesLimitWarning && <p className="text-xs text-amber-700">{rolesLimitWarning}</p>}
            <div className="grid sm:grid-cols-2 gap-2">
              {PRIORITY_ROLE_OPTIONS.map((role) => (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => toggleRole(role.key)}
                  className={`card-surface text-left p-3 border transition ${
                    selectedRoles.includes(role.key)
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm'
                      : 'border-slate-200'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">{role.label}</p>
                  <p className="text-xs text-slate-500">{role.helper}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700">Vos matières (max 2)</label>
              <p className="helper-text">Sélectionnez des matières présentes dans votre profil.</p>
              {subjectsLimitWarning && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1 mt-2">{subjectsLimitWarning}</p>
              )}
              <div
                className={`flex flex-wrap gap-2 mt-2 rounded-lg border p-2 transition ${subjectsLimitHighlight ? 'border-red-300 bg-red-50/70' : 'border-transparent'}`}
              >
                {subjectOptions.length === 0 ? (
                  <span className="text-xs text-rose-600">
                    Ajoutez des matières dans votre profil pour affiner les résultats.
                  </span>
                ) : (
                  subjectOptions.map((subject) => {
                    const subjectLabel = getSubjectShortNameByCode(subject);
                    return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`rounded-full border px-3 py-1 text-sm transition ${
                        selectedSubjects.includes(subject)
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {subjectLabel || 'M'}
                    </button>
                  );
                  })
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Catégorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1">
                <option value="">Toutes</option>
                <option value="study_partner">Study partner</option>
                <option value="project_team">Study team</option>
                <option value="tutor_offer">Tutor offer</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-emerald-600"
                checked={broaderResults}
                onChange={(e) => setBroaderResults(e.target.checked)}
              />
              <span>
                <span className="font-semibold text-slate-700">Résultats élargis</span>
                <span className="block text-xs text-slate-500">
                  Peut inclure des annonces d&apos;autres facultés ou sans matières communes.
                </span>
              </span>
            </label>
            <Link to="/posts/new" className="primary-btn w-full sm:w-auto text-center">Nouvelle annonce</Link>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card-surface p-6 text-sm text-slate-600">Chargement des annonces...</div>
        ) : filtered.length === 0 ? (
          <div className="card-surface p-6 text-sm text-slate-600">
            Aucun résultat pour ces filtres. Publiez une annonce ou ajustez vos critères.
          </div>
        ) : (
          filtered.map((post) => (
            <PostCard key={post._id} post={post} currentUserId={currentUserId} />
          ))
        )}
      </div>
    </div>
  );
};

export default PostsFeedPage;
