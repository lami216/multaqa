import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { http, type Profile } from '../lib/http';

const EditProfilePage: React.FC = () => {
  const [form, setForm] = useState<Profile>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await http.get<{ user: unknown; profile: Profile }>('/auth/me');
      setForm(data.profile ?? {});
    };

    void load();
  }, []);

  const handleChange = (field: keyof Profile, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    await http.patch('/users/me', {
      displayName: form.displayName,
      faculty: form.faculty,
      major: form.major,
      level: form.level,
      skills: form.skills ?? [],
      courses: form.courses ?? [],
      availability: form.availability,
      languages: form.languages ?? [],
      bio: form.bio,
    });
    setMessage('Profil mis à jour');
    setSaving(false);
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
            <label className="text-sm font-semibold text-slate-700">Nom d'affichage</label>
            <input value={form.displayName ?? ''} onChange={(e) => handleChange('displayName', e.target.value)} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Faculté</label>
            <input value={form.faculty ?? ''} onChange={(e) => handleChange('faculty', e.target.value)} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Niveau</label>
            <select value={form.level ?? ''} onChange={(e) => handleChange('level', e.target.value)} className="w-full mt-1">
              <option value="">Choisir</option>
              <option value="L1">Licence 1</option>
              <option value="L2">Licence 2</option>
              <option value="L3">Licence 3</option>
              <option value="M1">Master 1</option>
              <option value="M2">Master 2</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Compétences</label>
            <input value={(form.skills ?? []).join(', ')} onChange={(e) => handleChange('skills', e.target.value.split(',').map((v) => v.trim()))} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Matières</label>
            <input value={(form.courses ?? []).join(', ')} onChange={(e) => handleChange('courses', e.target.value.split(',').map((v) => v.trim()))} className="w-full mt-1" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Bio</label>
          <textarea value={form.bio ?? ''} onChange={(e) => handleChange('bio', e.target.value)} rows={4} className="w-full mt-1" />
        </div>
        {message && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2">{message}</div>}
        <button type="submit" className="primary-btn w-full sm:w-auto" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
      </form>
    </div>
  );
};

export default EditProfilePage;
