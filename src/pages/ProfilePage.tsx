import React, { useEffect, useState } from 'react';
import { Edit3, GraduationCap, MapPin, Notebook, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { http, type Profile } from '../lib/http';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  getFaculties,
  getLevelsByFaculty,
  getMajorsByFacultyAndLevel,
  getSemestersByMajorAndLevel,
  getSubjectsByMajorAndSemester,
  type CatalogFaculty,
  type CatalogLevel,
  type CatalogMajor,
  type CatalogSemester,
  type CatalogSubject
} from '../lib/catalog';

const ProfilePage: React.FC = () => {
  const { user, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(authProfile ?? null);
  const faculties = getFaculties();

  const cacheBustedAvatar = (url?: string, version?: string | number) => {
    if (!url) return undefined;
    const v = typeof version === 'number' ? version : version ? new Date(version).getTime() : Date.now();
    return `${url}?v=${v}`;
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.username) return;
      const { data } = await http.get<{ user: unknown; profile: Profile; posts: unknown }>(`/users/${user.username}`);
      setProfile(data.profile);
    };

    void load();
  }, [user?.username]);

  useEffect(() => {
    setProfile(authProfile ?? null);
  }, [authProfile]);

  const avatarUrl = cacheBustedAvatar(profile?.avatarUrl, profile?.updatedAt);
  const matchByIdOrName = <T extends { id: string; nameFr: string; nameAr: string }>(
    items: T[],
    value?: string
  ) => {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    return items.find(
      (item) =>
        item.id === value || item.nameFr.toLowerCase() === normalized || item.nameAr.toLowerCase() === normalized
    );
  };

  const resolvedFaculty = matchByIdOrName<CatalogFaculty>(faculties, profile?.facultyId ?? profile?.faculty);
  const levels = resolvedFaculty ? getLevelsByFaculty(resolvedFaculty.id) : [];
  const resolvedLevel = matchByIdOrName<CatalogLevel>(levels, profile?.level);
  const majors =
    resolvedFaculty && resolvedLevel ? getMajorsByFacultyAndLevel(resolvedFaculty.id, resolvedLevel.id) : [];
  const resolvedMajor = matchByIdOrName<CatalogMajor>(majors, profile?.majorId ?? profile?.major);
  const semesters =
    resolvedFaculty && resolvedLevel && resolvedMajor
      ? getSemestersByMajorAndLevel(resolvedFaculty.id, resolvedLevel.id, resolvedMajor.id)
      : [];
  const resolvedSemester = matchByIdOrName<CatalogSemester>(semesters, profile?.semesterId ?? profile?.semester);
  const catalogSubjects =
    resolvedFaculty && resolvedLevel && resolvedMajor && resolvedSemester
      ? getSubjectsByMajorAndSemester(
          resolvedFaculty.id,
          resolvedLevel.id,
          resolvedMajor.id,
          resolvedSemester.id
        )
      : [];
  const subjectCandidates = [...(profile?.subjectCodes ?? []), ...(profile?.subjects ?? [])].filter(Boolean);
  const resolvedSubjectNames = catalogSubjects
    .filter((subject: CatalogSubject) =>
      subjectCandidates.some(
        (candidate) =>
          candidate === subject.code ||
          candidate?.toLowerCase?.() === subject.nameFr.toLowerCase() ||
          candidate?.toLowerCase?.() === subject.nameAr.toLowerCase()
      )
    )
    .map((subject) => subject.nameFr);

  const facultyLabel = resolvedFaculty?.nameFr ?? profile?.faculty ?? 'Faculté non renseignée';
  const levelLabel = resolvedLevel?.nameFr ?? profile?.level ?? 'Niveau libre';
  const majorLabel = resolvedMajor?.nameFr ?? profile?.major ?? 'Filière non renseignée';
  const courseLabels = profile?.courses?.length ? profile.courses : resolvedSubjectNames;

  return (
    <div className="space-y-4">
      <div className="card-surface p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar className="h-20 w-20 rounded-2xl border border-emerald-100">
            <AvatarImage src={avatarUrl} alt="Avatar" />
            <AvatarFallback className="bg-emerald-50 text-emerald-700 flex items-center justify-center text-3xl font-bold">
              {user?.username?.[0]?.toUpperCase() ?? <User />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">{profile?.displayName ?? user?.username}</h1>
            <p className="text-slate-600 flex items-center gap-2 text-sm">
              <GraduationCap size={16} /> {facultyLabel} · {levelLabel} · {majorLabel}
            </p>
            <p className="text-slate-700 leading-relaxed text-sm">{profile?.bio ?? 'Ajoutez une bio pour présenter votre parcours.'}</p>
          </div>
          <div className="flex gap-2">
            {!profile?.profileLocked && (
              <Link to="/profile/edit" className="secondary-btn">
                <Edit3 size={16} className="me-1" /> Modifier
              </Link>
            )}
            <Link to="/posts" className="primary-btn">
              <Notebook size={16} className="me-1" /> Ses posts
            </Link>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="card-surface p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Compétences</h3>
            <div className="flex flex-wrap gap-2">
              {(profile?.skills ?? []).map((skill) => (
                <span key={skill} className="badge-soft">{skill}</span>
              ))}
              {!profile?.skills?.length && <span className="text-sm text-slate-500">Aucune compétence déclarée.</span>}
            </div>
          </div>
          <div className="card-surface p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Matières suivies</h3>
            <div className="flex flex-wrap gap-2">
              {(courseLabels ?? []).map((subject) => (
                <span key={subject} className="badge-soft">{subject}</span>
              ))}
              {!courseLabels?.length && <span className="text-sm text-slate-500">Ajoutez vos matières suivies.</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          <MapPin size={16} /> {profile?.availability ?? 'Disponibilité à définir'}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
