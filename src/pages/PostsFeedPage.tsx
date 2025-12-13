import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Filter, MessageCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient, { type StudyPost } from '../lib/apiClient';

const PostsFeedPage: React.FC = () => {
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('');
  const [posts, setPosts] = useState<StudyPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getPosts().then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const matchesLevel = level ? post.level === level : true;
      const matchesSubject = subject ? post.subject.toLowerCase().includes(subject.toLowerCase()) : true;
      const matchesType = type ? post.type === type : true;
      return matchesLevel && matchesSubject && matchesType;
    });
  }, [level, subject, type, posts]);

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
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Niveau</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full mt-1">
              <option value="">Tous</option>
              <option value="Licence 2">Licence 2</option>
              <option value="Licence 3">Licence 3</option>
              <option value="Master 1">Master 1</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Matière</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: IA, réseaux"
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full mt-1">
              <option value="">Tous</option>
              <option value="Review partner">Review partner</option>
              <option value="Study group">Study group</option>
              <option value="Free help">Free help</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card-surface p-6 text-sm text-slate-600">Chargement des annonces...</div>
        ) : filtered.length === 0 ? (
          <div className="card-surface p-6 text-sm text-slate-600">
            Aucun résultat pour ces filtres. Essayez une autre matière ou un autre niveau.
          </div>
        ) : (
          filtered.map((post) => (
            <div key={post.id} className="card-surface p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-2 items-center text-xs font-semibold text-emerald-700">
                    <span className="badge-soft">{post.type}</span>
                    <span className="badge-soft bg-blue-50 text-blue-700">{post.level}</span>
                  </div>
                  <Link to={`/posts/${post.id}`} className="text-xl font-semibold text-slate-900 hover:text-emerald-700">
                    {post.title}
                  </Link>
                  <p className="text-sm text-slate-600">{post.subject} · {post.faculty}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{post.description}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p className="font-semibold text-slate-800">{post.author}</p>
                  <p>{post.language}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/posts/${post.id}`} className="primary-btn">
                  <Users size={16} className="me-1" /> Rejoindre
                </Link>
                <button className="secondary-btn">
                  <MessageCircle size={16} className="me-1" /> Contacter
                </button>
                <button className="secondary-btn">
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
