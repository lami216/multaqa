import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Globe, MessageCircle, Users } from 'lucide-react';
import apiClient, { type StudyPost } from '../lib/apiClient';

const PostDetailsPage: React.FC = () => {
  const { id } = useParams();
  const [post, setPost] = useState<StudyPost | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    apiClient.getPostById(id).then((data) => {
      if (!data) {
        setNotFound(true);
        return;
      }

      setPost(data);
    });
  }, [id]);

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
          <p className="badge-soft inline-flex">{post.type}</p>
          <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
          <p className="text-slate-600">{post.subject} · {post.level}</p>
          <p className="text-slate-700 leading-relaxed">{post.description}</p>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="badge-soft bg-blue-50 text-blue-700">{post.faculty}</span>
            <span className="badge-soft bg-emerald-50 text-emerald-700">{post.language}</span>
            <span className="badge-soft bg-amber-50 text-amber-700">{post.availability}</span>
          </div>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p className="font-semibold text-slate-800">{post.author}</p>
          <p>ID annonce: {id}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="card-surface p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Compétences recherchées</h3>
          <div className="flex flex-wrap gap-2">
            {post.skills.map((skill) => (
              <span key={skill} className="badge-soft">{skill}</span>
            ))}
          </div>
        </div>
        <div className="card-surface p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Disponibilité</h3>
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={16} />
            <span>{post.availability}</span>
          </div>
        </div>
        <div className="card-surface p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Langue</h3>
          <div className="flex items-center gap-2 text-slate-600">
            <Globe size={16} />
            <span>{post.language}</span>
          </div>
        </div>
      </div>

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
