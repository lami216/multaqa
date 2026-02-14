import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, GraduationCap, MapPin, Notebook, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { generateTelegramLinkTokenRequest, http, type Profile, type RemainingSubjectItem } from '../lib/http';
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
import { PRIORITY_ROLE_LABELS } from '../lib/priorities';
import { buildSubjectInitials } from '../lib/subjectDisplay';

const ProfilePage: React.FC = () => {
  const { user, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(authProfile ?? null);
  const [remainingSelection, setRemainingSelection] = useState<RemainingSubjectItem[]>([]);
  const [hasRemainingFromPrevious, setHasRemainingFromPrevious] = useState<boolean | null>(null);
  const [previousMajorId, setPreviousMajorId] = useState<string>('');
  const [savingRemaining, setSavingRemaining] = useState(false);
  const [remainingMessage, setRemainingMessage] = useState('');
  const [remainingError, setRemainingError] = useState('');

  const [linkingTelegram, setLinkingTelegram] = useState(false);

  const handleTelegramLink = async () => {
    if (linkingTelegram) return;
    setLinkingTelegram(true);
    try {
      const { data } = await generateTelegramLinkTokenRequest();
      const { token, botUsername } = data;
      if (!botUsername) {
        console.error('Telegram bot username is missing in link token response');
        return;
      }
      window.location.href = `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
    } finally {
      setLinkingTelegram(false);
    }
  };
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
  const prioritiesOrder = profile?.prioritiesOrder ?? ['need_help', 'can_help', 'td', 'archive'];

  const currentLevelId = resolvedLevel?.id ?? profile?.level;
  const previousLevelMap: Record<string, string> = { L2: 'L1', L3: 'L2' };
  const previousLevel = currentLevelId ? previousLevelMap[currentLevelId] : undefined;
  const shouldAskRemaining = Boolean(profile?.profileLocked && resolvedFaculty && previousLevel);

  const previousMajors = useMemo(
    () => (resolvedFaculty && previousLevel ? getMajorsByFacultyAndLevel(resolvedFaculty.id, previousLevel) : []),
    [resolvedFaculty, previousLevel]
  );

  const remainingSubjectsCatalog = useMemo(() => {
    if (!resolvedFaculty || !previousLevel || !previousMajorId) return [];
    const prevSemesters = getSemestersByMajorAndLevel(resolvedFaculty.id, previousLevel, previousMajorId);
    const generated = prevSemesters.flatMap((semester) =>
      getSubjectsByMajorAndSemester(resolvedFaculty.id, previousLevel, previousMajorId, semester.id)
    );
    return Array.from(new Map(generated.map((subject) => [subject.code, subject])).values());
  }, [resolvedFaculty, previousLevel, previousMajorId]);

  useEffect(() => {
    const existing = (profile?.remainingSubjects ?? []).filter((item) => item.level === previousLevel);
    setRemainingSelection(existing);
    setHasRemainingFromPrevious(existing.length ? true : null);
    setPreviousMajorId(existing[0]?.majorId ?? '');
    setRemainingMessage('');
    setRemainingError('');
  }, [profile?.remainingSubjects, previousLevel]);

  const selectedRemainingCodes = new Set(remainingSelection.map((item) => item.subjectCode));

  const toggleRemainingSubject = (subjectCode: string) => {
    if (!previousLevel || !previousMajorId) return;
    setRemainingSelection((prev) => {
      const exists = prev.some(
        (item) => item.subjectCode === subjectCode && item.level === previousLevel && item.majorId === previousMajorId
      );
      if (exists) {
        return prev.filter(
          (item) => !(item.subjectCode === subjectCode && item.level === previousLevel && item.majorId === previousMajorId)
        );
      }
      return [...prev, { subjectCode, level: previousLevel, majorId: previousMajorId }];
    });
  };

  const saveRemainingSubjects = async () => {
    if (!profile) return;
    setSavingRemaining(true);
    setRemainingMessage('');
    setRemainingError('');
    try {
      const { data } = await http.patch<{ profile: Profile }>('/users/me', {
        remainingSubjects: hasRemainingFromPrevious === true ? remainingSelection : []
      });
      setProfile(data.profile);
      setRemainingMessage('تم حفظ المواد المتبقية بنجاح.');
    } catch {
      setRemainingError('تعذر حفظ المواد المتبقية، حاول مرة أخرى.');
    } finally {
      setSavingRemaining(false);
    }
  };

  const allRemaining = profile?.remainingSubjects ?? [];

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
          <div className="flex gap-2 flex-wrap">
            {!profile?.profileLocked && (
              <Link to="/profile/edit" className="secondary-btn">
                <Edit3 size={16} className="me-1" /> Modifier
              </Link>
            )}
            <button type="button" className="secondary-btn" onClick={() => void handleTelegramLink()} disabled={linkingTelegram}>
              ربط حسابي بتيليغرام
            </button>
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
                <span key={subject} className="badge-soft" title={subject}>{buildSubjectInitials(subject, subject)}</span>
              ))}
              {!courseLabels?.length && <span className="text-sm text-slate-500">Ajoutez vos matières suivies.</span>}
            </div>
          </div>
        </div>

        {!!allRemaining.length && (
          <div className="card-surface p-4">
            <h3 className="font-semibold text-slate-900 mb-2">مواد متبقية من مستوى سابق</h3>
            <div className="flex flex-wrap gap-2">
              {allRemaining.map((item) => (
                <span key={`${item.subjectCode}-${item.level}-${item.majorId}`} className="badge-soft bg-emerald-50 text-emerald-800">
                  {item.subjectCode} <span className="ms-1 text-[10px]">{item.level}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {shouldAskRemaining && (
          <div className="card-surface p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">هل لديك مواد متبقية من المستوى السابق</p>
            <div className="flex gap-2">
              <button type="button" className={`secondary-btn ${hasRemainingFromPrevious === true ? 'ring-2 ring-emerald-300' : ''}`} onClick={() => setHasRemainingFromPrevious(true)}>
                نعم
              </button>
              <button
                type="button"
                className={`secondary-btn ${hasRemainingFromPrevious === false ? 'ring-2 ring-emerald-300' : ''}`}
                onClick={() => {
                  setHasRemainingFromPrevious(false);
                  setRemainingSelection([]);
                  setPreviousMajorId('');
                }}
              >
                لا
              </button>
            </div>

            {hasRemainingFromPrevious === true && (
              <>
                <div>
                  <label className="text-sm font-semibold text-slate-700">تخصص المستوى السابق</label>
                  <select
                    value={previousMajorId}
                    onChange={(event) => {
                      setPreviousMajorId(event.target.value);
                      setRemainingSelection([]);
                    }}
                    className="w-full mt-1"
                    disabled={savingRemaining}
                  >
                    <option value="">Choisir</option>
                    {previousMajors.map((major) => (
                      <option key={major.id} value={major.id}>{major.nameFr}</option>
                    ))}
                  </select>
                </div>

                {!!remainingSubjectsCatalog.length && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {remainingSubjectsCatalog.map((subject) => {
                      const active = selectedRemainingCodes.has(subject.code);
                      return (
                        <button
                          key={subject.code}
                          type="button"
                          onClick={() => toggleRemainingSubject(subject.code)}
                          className={`rounded-xl border px-3 py-2 text-left transition ${active ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{subject.code}</span>
                            <span className="badge-soft text-[10px] px-2 py-0.5">{previousLevel}</span>
                          </div>
                          <p className="text-xs mt-1">{subject.nameAr}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {remainingError && <p className="text-xs text-red-600">{remainingError}</p>}
            {remainingMessage && <p className="text-xs text-emerald-700">{remainingMessage}</p>}
            <button type="button" className="primary-btn w-full sm:w-auto" onClick={saveRemainingSubjects} disabled={savingRemaining}>
              {savingRemaining ? 'Enregistrement...' : 'حفظ المواد المتبقية'}
            </button>
          </div>
        )}

        <div className="card-surface p-4">
          <h3 className="font-semibold text-slate-900 mb-2">ترتيب الأولوية</h3>
          <div className="flex flex-wrap gap-2">
            {prioritiesOrder.map((item, index) => (
              <span key={item} className="badge-soft bg-emerald-50 text-emerald-700">#{index + 1} {PRIORITY_ROLE_LABELS[item as keyof typeof PRIORITY_ROLE_LABELS] ?? item}</span>
            ))}
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
