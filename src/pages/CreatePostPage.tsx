import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Languages, PenSquare } from 'lucide-react';
import { createPost, type PostPayload } from '../lib/http';

const requestTypes: { value: PostPayload['category']; label: string }[] = [
  { value: 'study_partner', label: 'Study partner' },
  { value: 'project_team', label: 'Project team' },
  { value: 'tutor_offer', label: 'Tutor offer' },
];

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<PostPayload>({
    category: 'study_partner',
    title: '',
    description: '',
    faculty: '',
    level: undefined,
    languagePref: 'French',
    location: 'campus',
    tags: [],
  });
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof PostPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload: PostPayload = {
      ...form,
      tags: tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    createPost(payload)
      .then(() => navigate('/posts'))
      .catch(() => setError('Impossible de publier cette annonce pour le moment.'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase font-semibold text-emerald-600">Nouvelle annonce</p>
          <h1 className="section-title">Publier une demande ou offre</h1>
          <p className="helper-text">Sélectionnez le type de post et ajoutez quelques détails pour attirer les bons étudiants.</p>
        </div>
        <PenSquare className="text-emerald-600" />
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Type de demande</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {requestTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleChange('category', type.value)}
                  className={`tab-btn ${form.category === type.value ? 'active' : 'bg-white border border-slate-200'}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Matières</label>
            <input
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Titre de l'annonce"
              className="w-full mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Compétences / outils</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Python, Figma, SQL"
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Faculté / département</label>
            <input
              value={form.faculty ?? ''}
              onChange={(e) => handleChange('faculty', e.target.value)}
              placeholder="Ex: Informatique"
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Niveau</label>
            <select value={form.level ?? ''} onChange={(e) => handleChange('level', e.target.value)} className="w-full mt-1">
              <option value="">Sélectionnez</option>
              <option value="L1">Licence 1</option>
              <option value="L2">Licence 2</option>
              <option value="L3">Licence 3</option>
              <option value="M1">Master 1</option>
              <option value="M2">Master 2</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Langue préférée</label>
            <div className="flex gap-2 mt-1">
              {['French', 'Arabic'].map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => handleChange('languagePref', lng as PostPayload['languagePref'])}
                  className={`tab-btn flex-1 ${form.languagePref === lng ? 'active' : 'bg-white border border-slate-200'}`}
                >
                  <Languages size={14} className="me-1" />
                  {lng}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Disponibilité</label>
            <input
              value={form.location ?? ''}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Campus, en ligne ou hybride"
              className="w-full mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              placeholder="Ajoutez les objectifs, le rythme souhaité et le contexte."
              className="w-full mt-1"
              required
            />
          </div>
        </div>
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{error}</div>}
        <button type="submit" className="primary-btn w-full sm:w-auto" disabled={saving}>
          <CheckCircle2 className="me-2" size={18} /> {saving ? 'Publication...' : 'Publier la demande'}
        </button>
      </form>
    </div>
  );
};

export default CreatePostPage;
