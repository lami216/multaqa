import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchPosts, type PostResponse } from '../lib/http';

const HomePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await fetchPosts();
        setPosts(data.posts);
      } catch (error) {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filteredPosts = posts.filter((post) => {
    if (!query) return true;
    return (
      post.title.toLowerCase().includes(query.toLowerCase()) ||
      post.description.toLowerCase().includes(query.toLowerCase()) ||
      (post.tags ?? []).some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      <div className="card-surface p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-emerald-600 font-bold">Plateforme Étudiante</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Vos opportunités réelles</h1>
            <p className="helper-text mt-2">Toutes les annonces proviennent de la base de données MongoDB, aucune donnée fictive.</p>
          </div>
          <div className="hidden sm:flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700">
            <BookOpen />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Rechercher</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Search size={18} className="text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrez par titre, tag ou description"
                className="border-none flex-1 focus:ring-0 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Link to="/posts/new" className="primary-btn w-full text-center">Publier une annonce</Link>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Dernières annonces</h2>
          <span className="text-sm text-slate-500">{filteredPosts.length} résultats</span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="card-surface p-6 text-sm text-slate-600">Chargement des annonces...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="card-surface p-6 text-sm text-slate-600">
              Aucune annonce encore. Publiez votre première demande ou consultez le panneau admin pour configurer les filières.
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div key={post._id} className="card-surface p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-2 items-center text-xs font-semibold text-emerald-700">
                      <span className="badge-soft">{post.category}</span>
                      {post.level ? <span className="badge-soft bg-blue-50 text-blue-700">{post.level}</span> : null}
                    </div>
                    <Link to={`/posts/${post._id}`} className="text-xl font-semibold text-slate-900 hover:text-emerald-700">
                      {post.title}
                    </Link>
                    <p className="text-sm text-slate-600">{post.faculty ?? 'Faculté non renseignée'} · {post.languagePref ?? 'Langue libre'}</p>
                    <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{post.description}</p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p className="font-semibold text-slate-800">{post.author?.username ?? 'Auteur'}</p>
                    <p>{new Date(post.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {(post.tags ?? []).map((tag) => (
                    <span key={tag} className="badge-soft">{tag}</span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/posts/${post._id}`} className="primary-btn">Consulter</Link>
                  <Link to="/messages" className="secondary-btn">Contacter</Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Link
        to="/posts/new"
        className="fixed bottom-20 right-4 md:right-8 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
      >
        <Plus />
      </Link>
    </div>
  );
};

export default HomePage;
