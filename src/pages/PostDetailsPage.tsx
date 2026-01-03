import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Clock3, Globe, MessageCircle, Users } from 'lucide-react';
import { fetchPost, updatePost, type PostResponse } from '../lib/http';
import { useAuth } from '../context/AuthContext';

const roleLabels: Record<string, string> = {
  helper: 'Helper',
  partner: 'Partner',
  learner: 'Learner',
};

const PostDetailsPage: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<PostResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [extendChoice, setExtendChoice] = useState<'24' | '48' | '72' | 'custom'>('24');
  const [customExtend, setCustomExtend] = useState('');

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const { data } = await fetchPost(id);
        setPost({ ...data.post, author: data.author });
      } catch (error) {
        setNotFound(true);
      }
    };

    void load();
  }, [id]);

  const isAuthor = useMemo(() => (post?.authorId ? post.authorId === user?.id : false), [post?.authorId, user?.id]);
  const isStudyPartner = post?.category === 'study_partner';
  const extendHours = extendChoice === 'custom' ? Number(customExtend) : Number(extendChoice);

  const handleStatusUpdate = async () => {
    if (!id) return;
    setSaving(true);
    setActionError('');
    try {
      const { data } = await updatePost(id, { status: 'matched' });
      setPost((prev) => (prev ? { ...prev, ...data.post } : prev));
    } catch (error) {
      setActionError("Impossible de mettre à jour l'annonce.");
    } finally {
      setSaving(false);
    }
  };

  const handleExtend = async () => {
    if (!id) return;
    if (!Number.isFinite(extendHours) || extendHours <= 0) {
      setActionError('Sélectionnez une durée de prolongation valide.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      const { data } = await updatePost(id, { extendHours });
      setPost((prev) => (prev ? { ...prev, ...data.post } : prev));
    } catch (error) {
      setActionError("Impossible de prolonger l'annonce.");
    } finally {
      setSaving(false);
    }
  };

  if (!id || notFound) {
    return (
      <div className="card-surface p-5 space-y-3">
        <h1 className="section-title">Post introuvable</h1>
        <p className="helper-text">L'annonce demandée n'existe pas ou a été retirée.</p>
        <Link to="/posts" className="primary-btn w-fit">
          Retour aux posts
        </Link>
      </div>
    );
  }

  if (!post) {
    return <div className="card-surface p-5">Chargement des détails...</div>;
  }

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="badge-soft inline-flex">{post.category}</p>
          <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
          {isStudyPartner ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {(post.subjectCodes ?? []).map((subject) => (
                  <span key={subject} className="badge-soft bg-emerald-50 text-emerald-700">
                    {subject}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-600">Rôle : {post.studentRole ? roleLabels[post.studentRole] : 'Non précisé'}</p>
              {post.expiresAt && (
                <p className="text-sm text-slate-500">Expire le {new Date(post.expiresAt).toLocaleString()}</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-slate-600">{post.faculty ?? 'Faculté non renseignée'} · {post.level ?? 'Niveau libre'}</p>
              <p className="text-slate-700 leading-relaxed">{post.description}</p>
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="badge-soft bg-blue-50 text-blue-700">{post.location ?? 'Lieu flexible'}</span>
                <span className="badge-soft bg-emerald-50 text-emerald-700">{post.languagePref ?? 'Langue libre'}</span>
              </div>
            </>
          )}
        </div>
        <div className="text-right text-sm text-slate-500">
          <p className="font-semibold text-slate-800">{post.author?.username ?? 'Auteur'}</p>
          <p>ID annonce: {id}</p>
          {post.status && <p className="badge-soft mt-2">{post.status}</p>}
        </div>
      </div>

      {isStudyPartner && post.description ? (
        <div>
          <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
          <p className="text-slate-700 leading-relaxed">{post.description}</p>
        </div>
      ) : null}

      {!isStudyPartner && (
        <div className="grid md:grid-cols-3 gap-3">
          <div className="card-surface p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {(post.tags ?? []).map((skill) => (
                <span key={skill} className="badge-soft">{skill}</span>
              ))}
              {!post.tags?.length && <span className="text-sm text-slate-500">Aucun tag déclaré.</span>}
            </div>
          </div>
          <div className="card-surface p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Disponibilité</h3>
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={16} />
              <span>{post.location ?? 'À définir'}</span>
            </div>
          </div>
          <div className="card-surface p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Langue</h3>
            <div className="flex items-center gap-2 text-slate-600">
              <Globe size={16} />
              <span>{post.languagePref ?? 'Langue libre'}</span>
            </div>
          </div>
        </div>
      )}

      {isStudyPartner && isAuthor && (
        <div className="card-surface p-4 space-y-3">
          <h3 className="font-semibold text-slate-900">Gérer votre annonce</h3>
          {post.status === 'matched' ? (
            <p className="text-sm text-slate-500">Annonce marquée comme matched. Elle est désormais en lecture seule.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  className="secondary-btn"
                  type="button"
                  disabled={saving}
                  onClick={handleStatusUpdate}
                >
                  Marquer comme matched
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600">Prolonger :</span>
                {(['24', '48', '72', 'custom'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`tab-btn ${extendChoice === option ? 'active' : 'bg-white border border-slate-200'}`}
                    onClick={() => setExtendChoice(option)}
                  >
                    <Clock3 size={14} className="me-1" />
                    {option === 'custom' ? 'Personnalisé' : `${option}h`}
                  </button>
                ))}
                {extendChoice === 'custom' && (
                  <input
                    value={customExtend}
                    onChange={(e) => setCustomExtend(e.target.value)}
                    type="number"
                    min={1}
                    max={168}
                    placeholder="Heures"
                    className="w-32"
                  />
                )}
                <button className="primary-btn" type="button" disabled={saving} onClick={handleExtend}>
                  Prolonger
                </button>
              </div>
            </>
          )}
          {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button className="primary-btn">
          <Users size={16} className="me-1" /> Demander à rejoindre
        </button>
        <button className="secondary-btn">
          <MessageCircle size={16} className="me-1" /> Contacter
        </button>
        <Link to="/posts" className="secondary-btn">Retour au fil</Link>
      </div>
    </div>
  );
};

export default PostDetailsPage;
