import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Languages, PenSquare } from 'lucide-react';
import { createPost, type PostPayload } from '../lib/http';
import { useAuth } from '../context/AuthContext';
import { PRIORITY_ROLE_OPTIONS } from '../lib/priorities';

const requestTypes: { value: PostPayload['category']; label: string }[] = [
  { value: 'study_partner', label: 'Study partner' },
  { value: 'project_team', label: 'Project team' },
  { value: 'tutor_offer', label: 'Tutor offer' },
];

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
  const [postRole, setPostRole] = useState<PostPayload['postRole']>();
  const [durationChoice, setDurationChoice] = useState<(typeof durationOptions)[number]['value']>('24');
  const [customDurationInput, setCustomDurationInput] = useState('');
  const [customDurationHours, setCustomDurationHours] = useState<number | null>(null);
  const [shortDescription, setShortDescription] = useState('');
  const [subjectsLimitWarning, setSubjectsLimitWarning] = useState('');
  const [subjectsLimitHighlight, setSubjectsLimitHighlight] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const subjectsLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subjectOptions = useMemo(() => profile?.subjectCodes?.filter(Boolean) ?? [], [profile?.subjectCodes]);
  const isStudyPartner = form.category === 'study_partner';

  const durationHours = durationChoice === 'custom' ? customDurationHours ?? Number.NaN : Number(durationChoice);
  const studyPartnerValid =
    selectedSubjects.length >= 1 &&
    selectedSubjects.length <= 2 &&
    Boolean(postRole) &&
    Number.isFinite(durationHours) &&
    Number.isInteger(durationHours) &&
    durationHours > 0;

  const standardPostValid = Boolean(form.title?.trim() && form.description?.trim());

  const handleChange = (field: keyof PostPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    setSubjectsLimitWarning('');
    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) {
        return prev.filter((item) => item !== subject);
      }
      if (prev.length >= 2) {
        setSubjectsLimitWarning('Vous pouvez sélectionner deux matières maximum.');
        setSubjectsLimitHighlight(false);
        if (subjectsLimitTimeoutRef.current) {
          clearTimeout(subjectsLimitTimeoutRef.current);
        }
        requestAnimationFrame(() => {
          setSubjectsLimitHighlight(true);
          subjectsLimitTimeoutRef.current = setTimeout(() => setSubjectsLimitHighlight(false), 650);
        });
        return prev;
      }
      return [...prev, subject];
    });
  };

  useEffect(() => () => {
    if (subjectsLimitTimeoutRef.current) {
      clearTimeout(subjectsLimitTimeoutRef.current);
    }
  }, []);

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
        postRole: postRole!,
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
            <>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-700">Matières (1-2)</label>
                <p className="helper-text">Sélectionnez les matières déjà présentes dans votre profil.</p>
                {subjectsLimitWarning && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1">{subjectsLimitWarning}</p>
                )}
                <div
                  className={`flex flex-wrap gap-2 rounded-lg border p-2 transition ${subjectsLimitHighlight ? 'border-red-300 bg-red-50/70' : 'border-transparent'}`}
                >
                  {subjectOptions.map((subject) => {
                    const selected = selectedSubjects.includes(subject);
                    return (
                      <button
                        type="button"
                        key={subject}
                        onClick={() => toggleSubject(subject)}
                        className={`rounded-full border px-3 py-1 text-sm transition ${
                          selected ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-700">الدور</label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {PRIORITY_ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => setPostRole(role.key)}
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        postRole === role.key ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800">{role.label}</p>
                      <p className="text-xs text-slate-500">{role.helper}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Durée</label>
                <div className="flex flex-wrap gap-2">
                  {durationOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDurationChoice(option.value)}
                      className={`rounded-full border px-3 py-1 text-sm transition ${
                        durationChoice === option.value ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {durationChoice === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Durée personnalisée (heures)</label>
                  <div className="flex gap-2">
                    <input
                      value={customDurationInput}
                      onChange={(e) => setCustomDurationInput(e.target.value)}
                      className="w-full"
                      inputMode="numeric"
                      placeholder="Ex: 96"
                    />
                    <button type="button" className="secondary-btn" onClick={confirmCustomDuration}>
                      Confirmer
                    </button>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-700">Description courte (optionnelle)</label>
                <textarea
                  rows={3}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full"
                  placeholder="Ajoutez un contexte en restant bref."
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-semibold text-slate-700">Titre</label>
                <input className="w-full mt-1" value={form.title ?? ''} onChange={(e) => handleChange('title', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Tags (séparés par des virgules)</label>
                <input className="w-full mt-1" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  rows={5}
                  className="w-full mt-1"
                  value={form.description ?? ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Langue</label>
                <div className="flex gap-2 mt-1">
                  {['French', 'Arabic'].map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      onClick={() => handleChange('languagePref', lng as PostPayload['languagePref'])}
                      className={`tab-btn ${form.languagePref === lng ? 'active' : 'bg-white border border-slate-200'}`}
                    >
                      <Languages size={14} className="me-1" /> {lng}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Lieu</label>
                <div className="flex gap-2 mt-1">
                  {['campus', 'online'].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleChange('location', loc as PostPayload['location'])}
                      className={`tab-btn ${form.location === loc ? 'active' : 'bg-white border border-slate-200'}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">{error}</div>}

        <button
          type="submit"
          className="primary-btn w-full sm:w-auto"
          disabled={saving || (isStudyPartner ? !studyPartnerValid : !standardPostValid)}
        >
          {saving ? 'Publication...' : 'Publier'}
        </button>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><CheckCircle2 size={14} /> Les annonces respectent vos matières sélectionnées.</span>
          <span className="inline-flex items-center gap-1"><Clock3 size={14} /> Durée configurable par tranches de 24h.</span>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;
