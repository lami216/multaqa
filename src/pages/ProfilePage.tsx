import React from 'react';
import { Edit3, GraduationCap, MapPin, Notebook, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const profile = {
  name: 'Amina El Fassi',
  university: 'Université Mohammed VI',
  faculty: 'Informatique',
  level: 'Master 1',
  skills: ['Python', 'UX Research', 'SQL', 'Leadership'],
  subjects: ['IA', 'Data Viz', 'Gestion de projet'],
  bio: 'Passionnée par la recherche appliquée en IA et l’impact social de la technologie. J’aime travailler en équipe et partager mes connaissances.',
};

const ProfilePage: React.FC = () => (
  <div className="space-y-4">
    <div className="card-surface p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-20 w-20 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-3xl font-bold">
          <User />
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
          <p className="text-slate-600 flex items-center gap-2 text-sm">
            <GraduationCap size={16} /> {profile.university} · {profile.faculty} · {profile.level}
          </p>
          <p className="text-slate-700 leading-relaxed text-sm">{profile.bio}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/profile/edit" className="secondary-btn">
            <Edit3 size={16} className="me-1" /> Modifier
          </Link>
          <Link to="/posts" className="primary-btn">
            <Notebook size={16} className="me-1" /> Ses posts
          </Link>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="card-surface p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Compétences</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span key={skill} className="badge-soft">{skill}</span>
            ))}
          </div>
        </div>
        <div className="card-surface p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Matières suivies</h3>
          <div className="flex flex-wrap gap-2">
            {profile.subjects.map((subject) => (
              <span key={subject} className="badge-soft">{subject}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-sm text-slate-600">
        <MapPin size={16} /> Campus de Rabat · Disponible en soirée et weekend
      </div>
    </div>
  </div>
);

export default ProfilePage;
