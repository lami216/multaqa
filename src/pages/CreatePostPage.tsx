import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Languages, PenSquare } from 'lucide-react';
import { createPost, type PostPayload } from '../lib/http';
import { useAuth } from '../context/AuthContext';

const requestTypes: { value: PostPayload['category']; label: string }[] = [
  { value: 'study_partner', label: 'Study partner' },
  { value: 'project_team', label: 'Project team' },
  { value: 'tutor_offer', label: 'Tutor offer' },
];

const studentRoles = [
  { value: 'helper', label: 'Helper', helper: 'Je maîtrise la matière et je veux aider.' },
  { value: 'partner', label: 'Partner', helper: 'Niveau moyen, je veux réviser ensemble.' },
  { value: 'learner', label: 'Learner', helper: 'Je débute et j’ai besoin d’aide.' },
] as const;

const durationOptions = [
  { value: '24', label: '24h' },
  { value: '48', label: '48h' },
  { value: '72', label: '72h' },
  { value: 'custom', label: 'Personnalisé' },
] as const;

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
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
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [studentRole, setStudentRole] = useState<PostPayload['studentRole']>();
  const [durationChoice, setDurationChoice] = useState<(typeof durationOptions)[number]['value']>('24');
  const [customDurationInput, setCustomDurationInput] = useState('');
  const [customDurationHours, setCustomDurationHours] = useState<number | null>(null);
  const [shortDescription, setShortDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const subjectOptions = useMemo(() => profile?.subjectCodes?.filter(Boolean) ?? [], [profile?.subjectCodes]);
  const isStudyPartner = form.category === 'study_partner';

  const durationHours = durationChoice === 'custom' ? customDurationHours ?? Number.NaN : Number(durationChoice);
  const studyPartnerValid =
    selectedSubjects.length >= 1 &&
    selectedSubjects.length <= 2 &&
    Boolean(studentRole) &&
    Number.isFinite(durationHours) &&
    Number.isInteger(durationHours) &&
    durationHours > 0;

  const standardPostValid = Boolean(form.title?.trim() && form.description?.trim());

  const handleChange = (field: keyof PostPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDurationChoice = (value: (typeof durationOptions)[number]['value']) => {
    setDurationChoice(value);
  };

  const confirmCustomDuration = () => {
    const parsed = Number(customDurationInput.trim());
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      setDurationChoice('24');
      setCustomDurationInput('');
      setCustomDurationHours(null);
      setError('Sélectionnez une durée personnalisée valide.');
      return;
    }
    setError('');
    setCustomDurationHours(parsed);
  };

  const toggleSubject = (subject: string) => {
    setError('');
    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) {
        return prev.filter((item) => item !== subject);
      }
      if (prev.length >= 2) {
        setError('Vous pouvez sélectionner deux matières maximum.');
        return prev;
      }
      return [...prev, subject];
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    if (isStudyPartner && !studyPartnerValid) {
      setError('Sélectionnez vos matières, votre rôle et une durée valide.');
      setSaving(false);
      return;
    }

    const payload: PostPayload = isStudyPartner
      ? {
        category: 'study_partner',
        subjectCodes: selectedSubjects,
        studentRole: studentRole!,
        durationHours,
        description: shortDescription.trim() ? shortDescription.trim() : undefined,
      }
      : {
        ...form,
        tags: tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

    console.log('[createPost] durationHours=', durationHours);
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

          {isStudyPartner ? (
            <div className="md:col-span-2 space-y-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">Vos matières (max 2)</label>
                <p className="helper-text">Sélectionnez les matières déjà présentes dans votre profil.</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {subjectOptions.length === 0 ? (
                    <span className="text-sm text-rose-600">Ajoutez des matières dans votre profil pour continuer.</span>
                  ) : (
                    subjectOptions.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`badge-soft ${selectedSubjects.includes(subject) ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-slate-200 text-slate-600'}`}
                      >
                        {subject}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Votre rôle</label>
                <div className="grid sm:grid-cols-3 gap-2 mt-2">
                  {studentRoles.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setStudentRole(role.value)}
                      className={`card-surface text-left p-3 border transition ${
                        studentRole === role.value
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm'
                          : 'border-slate-200'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800">{role.label}</p>
                      <p className="text-xs text-slate-500">{role.helper}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Durée de publication</label>
                <div className="grid sm:grid-cols-4 gap-2 mt-2">
                  {durationOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleDurationChoice(option.value)}
                      className={`tab-btn ${durationChoice === option.value ? 'active' : 'bg-white border border-slate-200'}`}
                    >
                      <Clock3 size={14} className="me-1" />
                      {option.label}
                    </button>
                  ))}
                </div>
                {durationChoice === 'custom' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      value={customDurationInput}
                      onChange={(e) => setCustomDurationInput(e.target.value)}
                      type="number"
                      min={1}
                      max={168}
                      placeholder="Durée en heures"
                      className="flex-1 min-w-[160px]"
                    />
                    <button type="button" className="secondary-btn" onClick={confirmCustomDuration}>
                      OK
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Description courte (optionnel)</label>
                <textarea
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ex: préparation d'examen, rythme souhaité, créneaux." 
                  className="w-full mt-1"
                />
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{error}</div>}
        <button
          type="submit"
          className="primary-btn w-full sm:w-auto"
          disabled={saving || (isStudyPartner ? !studyPartnerValid : !standardPostValid)}
        >
          <CheckCircle2 className="me-2" size={18} /> {saving ? 'Publication...' : 'Publier la demande'}
        </button>
      </form>
    </div>
  );
};

export default CreatePostPage;
