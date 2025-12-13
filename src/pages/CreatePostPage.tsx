import React, { useState } from 'react';
import { CheckCircle2, Languages, PenSquare } from 'lucide-react';

const requestTypes = ['Review partner', 'Study group', 'Graduation project', 'Tutoring'];

const CreatePostPage: React.FC = () => {
  const [form, setForm] = useState({
    type: 'Review partner',
    subjects: '',
    skills: '',
    faculty: '',
    level: '',
    language: 'Français',
    availability: '',
    description: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    alert('Votre demande a été préparée pour publication.');
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
                  key={type}
                  type="button"
                  onClick={() => handleChange('type', type)}
                  className={`tab-btn ${form.type === type ? 'active' : 'bg-white border border-slate-200'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Matières</label>
            <input
              value={form.subjects}
              onChange={(e) => handleChange('subjects', e.target.value)}
              placeholder="Ex: IA, UX Design"
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Compétences / outils</label>
            <input
              value={form.skills}
              onChange={(e) => handleChange('skills', e.target.value)}
              placeholder="Python, Figma, SQL"
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Faculté / département</label>
            <input
              value={form.faculty}
              onChange={(e) => handleChange('faculty', e.target.value)}
              placeholder="Ex: Informatique"
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Niveau</label>
            <select value={form.level} onChange={(e) => handleChange('level', e.target.value)} className="w-full mt-1">
              <option value="">Sélectionnez</option>
              <option value="Licence">Licence</option>
              <option value="Master">Master</option>
              <option value="Doctorat">Doctorat</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Langue préférée</label>
            <div className="flex gap-2 mt-1">
              {['Français', 'العربية', 'English'].map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => handleChange('language', lng)}
                  className={`tab-btn flex-1 ${form.language === lng ? 'active' : 'bg-white border border-slate-200'}`}
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
              value={form.availability}
              onChange={(e) => handleChange('availability', e.target.value)}
              placeholder="Soirée, Week-end, en ligne"
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
            />
          </div>
        </div>
        <button type="submit" className="primary-btn w-full sm:w-auto">
          <CheckCircle2 className="me-2" size={18} /> Publier la demande
        </button>
      </form>
    </div>
  );
};

export default CreatePostPage;
