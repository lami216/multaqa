import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, MessageCircle, Plus, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import SearchField from '../components/common/SearchField';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchPosts, type PostResponse } from '../lib/http';

const HomePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenMatchedIds, setHiddenMatchedIds] = useState<string[]>([]);
  const { currentUserId } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await fetchPosts();
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      } catch (error) {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('matchedPostsHidden');
    setHiddenMatchedIds(stored ? (JSON.parse(stored) as string[]) : []);
  }, []);

  const filteredPosts = useMemo(() => posts.filter((post) => {
    if (hiddenMatchedIds.includes(post._id)) return false;
    if (!query) return true;
    const normalizedQuery = query.toLowerCase();
    return (
      post.title.toLowerCase().includes(normalizedQuery) ||
      (post.description ?? '').toLowerCase().includes(normalizedQuery) ||
      (post.tags ?? []).some((tag) => tag.toLowerCase().includes(normalizedQuery))
    );
  }), [hiddenMatchedIds, posts, query]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-hover sm:p-8">
        <div className="absolute -start-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-28 end-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100 ring-1 ring-white/15">
              <Sparkles size={14} /> {t.home.eyebrow}
            </span>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{t.home.title}</h1>
              <p className="text-base leading-7 text-slate-300 sm:text-lg">{t.home.subtitle}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <div className="rounded-[1.35rem] bg-white p-1 text-slate-900 shadow-card">
                <SearchField value={query} onChange={setQuery} label={t.home.searchLabel} placeholder={t.home.searchPlaceholder} />
              </div>
              <Link to="/posts" className="secondary-btn border-white/15 bg-white/10 text-white hover:bg-white hover:text-slate-950">
                {t.home.filters}
              </Link>
              <Link to="/posts/new" className="primary-btn bg-emerald-500 hover:bg-emerald-400">
                <Plus size={18} /> {t.home.create}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {[
              { icon: Users, label: t.home.statsPartners, value: posts.length },
              { icon: MessageCircle, label: t.home.statsFast, value: '24h' },
              { icon: BookOpen, label: t.home.statsSafe, value: '100%' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/10 p-3 backdrop-blur sm:p-4">
                  <Icon size={18} className="text-emerald-200" />
                  <p className="mt-3 text-xl font-black">{stat.value}</p>
                  <p className="text-xs font-semibold text-slate-300">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{t.home.latest}</h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-500 shadow-sm ring-1 ring-slate-200/70">
            {filteredPosts.length} {t.home.results}
          </span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="premium-panel p-6 text-sm font-semibold text-slate-500">{t.home.loading}</div>
          ) : filteredPosts.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={t.home.emptyTitle}
              description={t.home.emptyDescription}
              action={<Link to="/posts/new" className="primary-btn"><Plus size={16} /> {t.home.create}</Link>}
            />
          ) : (
            filteredPosts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUserId={currentUserId}
                showTags
                clampDescription
              />
            ))
          )}
        </div>
      </section>

      <Link
        to="/posts/new"
        className="fixed bottom-28 end-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-hover transition hover:-translate-y-1 hover:bg-emerald-600 md:bottom-8 md:end-8"
        aria-label={t.home.create}
      >
        <Plus />
      </Link>
    </div>
  );
};

export default HomePage;
