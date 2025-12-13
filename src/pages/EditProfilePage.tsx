import React, { useState } from 'react';
import { Camera } from 'lucide-react';

const EditProfilePage: React.FC = () => {
  const [form, setForm] = useState({
    name: 'Amina El Fassi',
    university: 'Université Mohammed VI',
    faculty: 'Informatique',
    level: 'Master 1',
    skills: 'Python, UX Research, SQL',
    subjects: 'IA, Data Viz, Gestion de projet',
    bio: 'Explorant la recherche appliquée en IA.',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    alert('Profil mis à jour');
  };

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase font-semibold text-emerald-600">Profil</p>
          <h1 className="section-title">Mettre à jour mon profil</h1>
          <p className="helper-text">Ajoutez vos compétences, matières et disponibilités pour de meilleurs matchs.</p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold">
            <Camera />
          </div>
          <button type="button" className="secondary-btn">Télécharger une photo</button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Nom complet</label>
            <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Université</label>
            <input value={form.university} onChange={(e) => handleChange('university', e.target.value)} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Faculté</label>
            <input value={form.faculty} onChange={(e) => handleChange('faculty', e.target.value)} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Niveau</label>
            <select value={form.level} onChange={(e) => handleChange('level', e.target.value)} className="w-full mt-1">
              <option value="Licence">Licence</option>
              <option value="Master">Master</option>
              <option value="Doctorat">Doctorat</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Compétences</label>
            <input value={form.skills} onChange={(e) => handleChange('skills', e.target.value)} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Matières</label>
            <input value={form.subjects} onChange={(e) => handleChange('subjects', e.target.value)} className="w-full mt-1" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Bio</label>
          <textarea value={form.bio} onChange={(e) => handleChange('bio', e.target.value)} rows={4} className="w-full mt-1" />
        </div>
        <button type="submit" className="primary-btn w-full sm:w-auto">Enregistrer</button>
      </form>
    </div>
  );
};

export default EditProfilePage;
