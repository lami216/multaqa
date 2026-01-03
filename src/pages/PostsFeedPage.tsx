import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Filter, MessageCircle, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createConversation, fetchPosts, type PostResponse } from '../lib/http';
import { useAuth } from '../context/AuthContext';

const PostsFeedPage: React.FC = () => {
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const matchesLevel = level ? post.level === level : true;
      const matchesCategory = category ? post.category === category : true;
      const matchesSearch = search
        ? post.title.toLowerCase().includes(search.toLowerCase()) ||
          (post.description ?? '').toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesLevel && matchesCategory && matchesSearch;
    });
  }, [level, category, search, posts]);

  const resolveAuthorId = (post: PostResponse) => {
    if (typeof post.authorId === 'string') return post.authorId;
    if (post.authorId && typeof post.authorId === 'object' && '_id' in post.authorId) {
      return (post.authorId as { _id: string })._id;
    }
    return '';
  };

  const handleContact = async (post: PostResponse) => {
    const authorId = resolveAuthorId(post);
    if (!authorId || authorId === user?.id) return;
    const { data } = await createConversation({ type: 'post', postId: post._id, otherUserId: authorId });
    navigate(`/messages/${data.conversationId}`);
  };

  const handleDirect = async (post: PostResponse) => {
    const authorId = resolveAuthorId(post);
    if (!authorId || authorId === user?.id) return;
    const { data } = await createConversation({ type: 'direct', otherUserId: authorId });
    navigate(`/messages/${data.conversationId}`);
  };

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
        <div className="grid md:grid-cols-4 gap-3">
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
              <option value="project_team">Project team</option>
              <option value="tutor_offer">Tutor offer</option>
            </select>
          </div>
          <div className="flex items-end">
            <Link to="/posts/new" className="primary-btn w-full text-center">Nouvelle annonce</Link>
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
            <div key={post._id} className="card-surface p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-2 items-center text-xs font-semibold text-emerald-700">
                    <span className="badge-soft">{post.category}</span>
                    {post.level ? <span className="badge-soft bg-blue-50 text-blue-700">{post.level}</span> : null}
                    {post.languagePref ? <span className="badge-soft bg-emerald-50 text-emerald-700">{post.languagePref}</span> : null}
                  </div>
                  <Link to={`/posts/${post._id}`} className="text-xl font-semibold text-slate-900 hover:text-emerald-700">
                    {post.title}
                  </Link>
                  {post.category === 'study_partner' ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {(post.subjectCodes ?? []).map((subject) => (
                          <span key={subject} className="badge-soft bg-emerald-50 text-emerald-700">{subject}</span>
                        ))}
                      </div>
                      <p className="text-sm text-slate-600">
                        Rôle: {post.studentRole ?? 'Non précisé'}
                      </p>
                      {post.description ? (
                        <p className="text-sm text-slate-700 leading-relaxed">{post.description}</p>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600">{post.faculty ?? 'Faculté non renseignée'}</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{post.description}</p>
                    </>
                  )}
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p className="font-semibold text-slate-800">{post.author?.username ?? 'Auteur'}</p>
                  <p>{new Date(post.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/posts/${post._id}`} className="primary-btn">
                  <Users size={16} className="me-1" /> Consulter
                </Link>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => handleContact(post)}
                  disabled={resolveAuthorId(post) === user?.id}
                >
                  <MessageCircle size={16} className="me-1" /> Contacter
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => handleDirect(post)}
                  disabled={resolveAuthorId(post) === user?.id}
                >
                  <MessageCircle size={16} className="me-1" /> Message direct
                </button>
                <button className="secondary-btn" type="button" disabled>
                  <Bookmark size={16} className="me-1" /> Sauvegarder
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PostsFeedPage;
