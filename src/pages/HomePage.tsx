import React, { useMemo, useState } from 'react';
import { BookOpen, Plus, Search, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const modes = [
  { key: 'review', label: 'Review partner' },
  { key: 'study', label: 'Study group' },
  { key: 'help', label: 'Free help' },
];

const subjects = ['Algorithmique', 'Mathématiques', 'IA', 'Bases de données', 'Réseaux', 'Design', 'Marketing'];

const students = [
  {
    id: 1,
    name: 'Sara Benali',
    faculty: 'Informatique',
    level: 'Licence 3',
    subjects: ['IA', 'Algorithmique'],
    partnerType: 'Review partner',
    mode: 'review',
    match: 94,
    avatar: 'https://i.pravatar.cc/120?img=47',
    language: 'Français',
  },
  {
    id: 2,
    name: 'Omar Lahlou',
    faculty: 'Ingénierie',
    level: 'Master 1',
    subjects: ['Réseaux', 'Cybersécurité'],
    partnerType: 'Study group',
    mode: 'study',
    match: 88,
    avatar: 'https://i.pravatar.cc/120?img=11',
    language: 'العربية',
  },
  {
    id: 3,
    name: 'Nour Hassan',
    faculty: 'Business School',
    level: 'Licence 2',
    subjects: ['Marketing', 'Stratégie'],
    partnerType: 'Free help',
    mode: 'help',
    match: 91,
    avatar: 'https://i.pravatar.cc/120?img=32',
    language: 'العربية',
  },
  {
    id: 4,
    name: 'Yasmine Ait',
    faculty: 'Sciences',
    level: 'Master 2',
    subjects: ['Biotech', 'Data'],
    partnerType: 'Study group',
    mode: 'study',
    match: 86,
    avatar: 'https://i.pravatar.cc/120?img=5',
    language: 'Français',
  },
];

const HomePage: React.FC = () => {
  const { language } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<string>('review');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [subjectText, setSubjectText] = useState('');

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesMode = student.mode === selectedMode;
      const matchesSelect = selectedSubject ? student.subjects.includes(selectedSubject) : true;
      const matchesText = subjectText ? student.subjects.some((s) => s.toLowerCase().includes(subjectText.toLowerCase())) : true;
      return matchesMode && matchesSelect && matchesText;
    });
  }, [selectedMode, selectedSubject, subjectText]);

  return (
    <div className="space-y-6">
      <div className="card-surface p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-emerald-600 font-bold">Plateforme Étudiante</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Trouvez votre binôme d'étude idéal</h1>
            <p className="helper-text mt-2">Filtres rapides pour trouver un partenaire ou un groupe en quelques clics.</p>
          </div>
          <div className="hidden sm:flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700">
            <BookOpen />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="text-sm font-semibold text-slate-700">Matière</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full mt-1">
              <option value="">Sélectionner une matière</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label className="text-sm font-semibold text-slate-700">Ou tapez le nom</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Search size={18} className="text-slate-400" />
              <input
                value={subjectText}
                onChange={(e) => setSubjectText(e.target.value)}
                placeholder="Ex: Machine Learning"
                className="border-none flex-1 focus:ring-0 focus:border-transparent"
              />
            </div>
          </div>
          <div className="col-span-1">
            <label className="text-sm font-semibold text-slate-700">Langue préférée</label>
            <div className="flex gap-2 mt-1">
              <button type="button" className={`tab-btn flex-1 ${language === 'fr' ? 'active' : 'bg-white border border-slate-200'}`}>
                Français
              </button>
              <button type="button" className={`tab-btn flex-1 ${language === 'ar' ? 'active' : 'bg-white border border-slate-200'}`}>
                العربية
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 bg-slate-50 rounded-2xl p-2 text-sm font-semibold text-slate-600">
          {modes.map((mode) => (
            <button
              key={mode.key}
              type="button"
              onClick={() => setSelectedMode(mode.key)}
              className={`tab-btn flex-1 text-center ${selectedMode === mode.key ? 'active' : 'bg-white border border-slate-200'}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Suggestions personnalisées</h2>
          <span className="text-sm text-slate-500">{filteredStudents.length} résultats</span>
        </div>

        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <div key={student.id} className="card-surface p-4 sm:p-5 flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <img src={student.avatar} alt={student.name} className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-100" />
                <div className="badge-soft">{student.language}</div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-slate-900">{student.name}</p>
                    <p className="text-sm text-slate-600">{student.faculty} · {student.level}</p>
                    <div className="flex flex-wrap gap-2">
                      {student.subjects.map((subject) => (
                        <span key={subject} className="badge-soft">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-emerald-600">{student.match}%</p>
                    <p className="text-xs text-slate-500">de compatibilité</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <UserRound size={16} />
                  <span>{student.partnerType}</span>
                  <span className="text-slate-300">•</span>
                  <span>Réponse rapide 1h</span>
                  <span className="text-slate-300">•</span>
                  <span>Disponibilité soir et week-end</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="primary-btn">Demander à rejoindre</button>
                  <button className="secondary-btn">Contacter</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link
        to="/posts/new"
        className="fixed bottom-20 right-4 md:right-8 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
      >
        <Plus />
      </Link>
    </div>
  );
};

export default HomePage;
