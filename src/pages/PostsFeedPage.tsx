import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchPosts, type PostResponse } from '../lib/http';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

type IntentValue = 'NEED_HELP' | 'STUDY_TOGETHER' | 'I_CAN_HELP';

const intentOptions: Array<{ value: IntentValue; title: string; subtitle: string }> = [
  { value: 'NEED_HELP', title: "J’ai besoin d’aide", subtitle: 'أحتاج مساعدة' },
  { value: 'STUDY_TOGETHER', title: 'Réviser ensemble', subtitle: 'نراجع معًا' },
  { value: 'I_CAN_HELP', title: 'Je peux aider', subtitle: 'أستطيع المساعدة' }
];

const intentStorageKey = 'feedIntent';

const PostsFeedPage: React.FC = () => {
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [hiddenMatchedIds, setHiddenMatchedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersReady, setFiltersReady] = useState(false);
  const { currentUserId, profile, user, loading: authLoading } = useAuth();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [broaderResults, setBroaderResults] = useState(false);
  const [intent, setIntent] = useState<IntentValue>(() => {
    if (typeof window === 'undefined') return 'STUDY_TOGETHER';
    const stored = window.localStorage.getItem(intentStorageKey);
    if (stored === 'NEED_HELP' || stored === 'STUDY_TOGETHER' || stored === 'I_CAN_HELP') {
      return stored;
    }
    return 'STUDY_TOGETHER';
  });
  const didSetDefaultsRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(intentStorageKey, intent);
  }, [intent]);

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
        if (level) params.level = level;
        if (search) params.searchText = search;
        if (category) params.category = category;
        if (intent) params.intent = intent;
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
  }, [level, search, category, intent, selectedSubjects, broaderResults, user, authLoading, filtersReady]);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) {
        return prev.filter((item) => item !== subject);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, subject];
    });
  };

  const filtered = useMemo(() => {
    return (posts ?? []).filter((post) => !hiddenMatchedIds.includes(post._id));
  }, [posts, hiddenMatchedIds]);

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
          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-slate-700">Intention de recherche • نية البحث</p>
              <p className="helper-text">Vous pouvez changer votre intention à tout moment.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              {intentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setIntent(option.value)}
                  className={`card-surface text-left p-3 border transition ${
                    intent === option.value
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm'
                      : 'border-slate-200'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">{option.title}</p>
                  <p className="text-xs text-slate-500">{option.subtitle}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700">Niveau</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full mt-1">
                <option value="">Tous</option>
                <option value="L1">Licence 1</option>
                <option value="L2">Licence 2</option>
                <option value="L3">Licence 3</option>
                <option value="M1">Master 1</option>
                <option value="M2">Master 2</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Vos matières (max 2)</label>
              <p className="helper-text">Sélectionnez des matières présentes dans votre profil.</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {subjectOptions.length === 0 ? (
                  <span className="text-xs text-rose-600">
                    Ajoutez des matières dans votre profil pour affiner les résultats.
                  </span>
                ) : (
                  subjectOptions.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`badge-soft ${
                        selectedSubjects.includes(subject)
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {subject}
                    </button>
                  ))
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Recherche</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Titre ou description"
                className="w-full mt-1"
              />
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
