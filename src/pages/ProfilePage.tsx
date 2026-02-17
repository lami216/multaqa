import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, GraduationCap, MapPin, MessageCircle, Notebook, Settings, Star, User } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchAcademicSettings, generateTelegramLinkTokenRequest, http, type AcademicSettingsResponse, type Profile, type RemainingSubjectItem } from '../lib/http';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  buildAcademicMajorKey,
  getCatalogSubjectByCode,
  getFaculties,
  getLevelsByFaculty,
  getMajorsByFacultyAndLevel,
  getSubjectsByMajorAndSemester,
  getSubjectsByMajorAndSemesters,
  getTermSemesterForLevel,
  isFacultyEnabled,
  type CatalogFaculty,
  type CatalogLevel,
  type CatalogMajor,
  type CatalogSubject
} from '../lib/catalog';
import { PRIORITY_ROLE_LABELS } from '../lib/priorities';
import { buildSubjectInitials } from '../lib/subjectDisplay';
import { useLanguage } from '../context/LanguageContext';

const ProfilePage: React.FC = () => {
  const { language } = useLanguage();
  const { user, profile: authProfile, refresh, currentUserId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  type ProfileView = Profile & { userId?: string; avgRating?: number; sessionsCount?: number; reviewsCount?: number };
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [remainingSelection, setRemainingSelection] = useState<RemainingSubjectItem[]>([]);
  const [hasRemainingFromPrevious, setHasRemainingFromPrevious] = useState<boolean | null>(null);
  const [previousMajorId, setPreviousMajorId] = useState<string>('');
  const [savingRemaining, setSavingRemaining] = useState(false);
  const [remainingMessage, setRemainingMessage] = useState('');
  const [remainingError, setRemainingError] = useState('');

  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'resources' | 'reviews'>('posts');
  const [academicSettings, setAcademicSettings] = useState<AcademicSettingsResponse>({
    academicTermType: 'odd',
    catalogVisibility: { faculties: {}, majors: {} },
    preregCounts: {},
    majorAvailability: {}
  });

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
  const faculties = getFaculties().filter((faculty) => isFacultyEnabled(faculty.id, academicSettings.catalogVisibility));

  const cacheBustedAvatar = (url?: string, version?: string | number) => {
    if (!url) return undefined;
    const v = typeof version === 'number' ? version : version ? new Date(version).getTime() : Date.now();
    return `${url}?v=${v}`;
  };

  useEffect(() => {
    const load = async () => {
      const profileEndpoint = id ? `/users/id/${id}` : (currentUserId ? `/users/id/${currentUserId}` : '');
      if (!profileEndpoint) return;
      const [{ data }, { data: settingsData }] = await Promise.all([
        http.get<{ user: { id: string; averageRating?: number; totalReviews?: number; sessionsCount?: number }; profile: Profile; posts: unknown }>(profileEndpoint, {
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
          }
        }),
        fetchAcademicSettings()
      ]);
      const merged = {
        ...(data.profile ?? {}),
        userId: data.user?.id,
        avgRating: data.user?.averageRating ?? 0,
        reviewsCount: data.user?.totalReviews ?? 0,
        sessionsCount: data.user?.sessionsCount ?? 0
      } as ProfileView;
      setProfile(merged);
      setAcademicSettings(settingsData);
    };

    void load();
  }, [id, currentUserId]);

  useEffect(() => {
    if (!id && authProfile) {
      setProfile((prev) => ({
        ...authProfile,
        userId: currentUserId,
        avgRating: prev?.avgRating ?? user?.averageRating ?? 0,
        reviewsCount: prev?.reviewsCount ?? user?.totalReviews ?? 0,
        sessionsCount: prev?.sessionsCount ?? user?.sessionsCount ?? 0
      }));
    }
  }, [authProfile, id, currentUserId, user?.averageRating, user?.totalReviews, user?.sessionsCount]);

  const avatarUrl = cacheBustedAvatar(profile?.avatarUrl, profile?.updatedAt);
  const profileView = profile as ProfileView | null;
  const isOwner = Boolean(currentUserId && profileView?.userId && currentUserId === profileView.userId);
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
  const levels = resolvedFaculty ? getLevelsByFaculty(resolvedFaculty.id, academicSettings.catalogVisibility) : [];
  const resolvedLevel = matchByIdOrName<CatalogLevel>(levels, profile?.level);
  const majors =
    resolvedFaculty && resolvedLevel
      ? getMajorsByFacultyAndLevel(resolvedFaculty.id, resolvedLevel.id, academicSettings.catalogVisibility)
      : [];
  const resolvedMajor = matchByIdOrName<CatalogMajor>(majors, profile?.majorId ?? profile?.major);
  const mappedSemesterId = resolvedLevel ? getTermSemesterForLevel(resolvedLevel.id, academicSettings.academicTermType) : undefined;
  const catalogSubjects =
    resolvedFaculty && resolvedLevel && resolvedMajor && mappedSemesterId
      ? getSubjectsByMajorAndSemester(
          resolvedFaculty.id,
          resolvedLevel.id,
          resolvedMajor.id,
          mappedSemesterId,
          academicSettings.academicTermType,
          academicSettings.catalogVisibility
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
  const majorKey = resolvedFaculty && resolvedLevel && resolvedMajor ? buildAcademicMajorKey(resolvedFaculty.id, resolvedLevel.id, resolvedMajor.id) : '';
  const majorAvailability = majorKey ? academicSettings.majorAvailability?.[majorKey] : undefined;
  const majorStatus = majorAvailability?.status ?? 'active';
  const majorPreregCount = majorAvailability?.registeredCount ?? 0;
  const majorThreshold = majorAvailability?.threshold ?? 0;

  const currentLevelId = resolvedLevel?.id ?? profile?.level;
  const previousLevelMap: Record<string, string> = { L2: 'L1', L3: 'L2' };
  const previousLevel = currentLevelId ? previousLevelMap[currentLevelId] : undefined;
  const shouldAskRemaining = Boolean(profile?.profileLocked && resolvedFaculty && previousLevel && !user?.remainingSubjectsConfirmed);

  const previousMajors = useMemo(
    () => (resolvedFaculty && previousLevel ? getMajorsByFacultyAndLevel(resolvedFaculty.id, previousLevel, academicSettings.catalogVisibility) : []),
    [resolvedFaculty, previousLevel]
  );

  const remainingSubjectsCatalog = useMemo(() => {
    if (!resolvedFaculty || !previousLevel || !previousMajorId || !currentLevelId) return [];
    const levelTermMap: Record<string, { odd: string[]; even: string[] }> = {
      L2: { odd: ['S3', 'S1'], even: ['S4', 'S2'] },
      L3: { odd: ['S5', 'S3'], even: ['S6', 'S4'] }
    };
    const semesters = levelTermMap[currentLevelId]?.[academicSettings.academicTermType] ?? [];
    const generated = getSubjectsByMajorAndSemesters(
      resolvedFaculty.id,
      previousLevel,
      previousMajorId,
      semesters,
      academicSettings.academicTermType,
      academicSettings.catalogVisibility
    );
    return Array.from(new Map(generated.map((subject) => [subject.code, subject])).values());
  }, [resolvedFaculty, previousLevel, previousMajorId, currentLevelId, academicSettings.academicTermType, academicSettings.catalogVisibility]);

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
      await refresh();
      setRemainingMessage('تم حفظ المواد المتبقية بنجاح.');
    } catch {
      setRemainingError('تعذر حفظ المواد المتبقية، حاول مرة أخرى.');
    } finally {
      setSavingRemaining(false);
    }
  };

  const allRemaining = profile?.remainingSubjects ?? [];
  const remainingDisplaySubjects = allRemaining.map((item) => {
    const catalogSubject = getCatalogSubjectByCode(item.subjectCode);
    const fullName =
      language === 'ar'
        ? catalogSubject?.nameAr || catalogSubject?.nameFr || catalogSubject?.name
        : catalogSubject?.nameFr || catalogSubject?.nameAr || catalogSubject?.name;
    const fallback = buildSubjectInitials(fullName, item.subjectCode).slice(0, 2) || item.subjectCode;

    return {
      id: `${item.subjectCode}-${item.level}-${item.majorId}`,
      label: fullName || fallback
    };
  });
  const reviewsCount = profileView?.reviewsCount ?? 0;
  const sessionsCount = profileView?.sessionsCount ?? 0;
  const avgRating = profileView?.avgRating ?? 0;

  return (
    <div className="space-y-6">
      <section className="card-surface p-5 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 rounded-full border-2 border-emerald-100">
              <AvatarImage src={avatarUrl} alt="Avatar" />
              <AvatarFallback className="bg-emerald-50 text-emerald-700 flex items-center justify-center text-3xl font-bold">
                {(profile?.displayName?.[0] ?? user?.username?.[0])?.toUpperCase() ?? <User />}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-slate-900">{profile?.displayName ?? (id ? undefined : user?.username)}</h1>
              <p className="text-slate-600 flex items-center gap-2 text-sm">
                <GraduationCap size={16} /> {facultyLabel} · {levelLabel} · {majorLabel}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{profile?.bio ?? 'Ajoutez une bio pour présenter votre parcours.'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner ? (
              <>
                {!profile?.profileLocked && (
                  <Link to="/profile/edit" className="secondary-btn">
                    <Edit3 size={16} className="me-1" /> Edit Profile
                  </Link>
                )}
                <button type="button" className="secondary-btn" aria-label="Settings">
                  <Settings size={16} className="me-1" /> Settings
                </button>
              </>
) : null}
            {!isOwner && profileView?.userId ? (
              <button
                type="button"
                className="secondary-btn"
                onClick={async () => {
                  if (profileView.userId === currentUserId) return;
                  const { data } = await http.post<{ conversationId: string }>('/conversations', { type: 'direct', otherUserId: profileView.userId });
                  navigate(`/messages/${data.conversationId}`);
                }}
              >
                <MessageCircle size={16} className="me-1" /> Message
              </button>
            ) : null}
            {isOwner ? (
              <button type="button" className="secondary-btn" onClick={() => void handleTelegramLink()} disabled={linkingTelegram}>
                ربط حسابي بتيليغرام
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{reviewsCount}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Reviews</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{sessionsCount}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sessions</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 flex items-center justify-center gap-1">
              <Star size={16} className="fill-amber-400 text-amber-400" /> {avgRating}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Rating</p>
          </div>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'posts', label: 'Posts' },
              { key: 'resources', label: 'Resources' },
              { key: 'reviews', label: 'Reviews' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'posts' | 'resources' | 'reviews')}
                className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'posts' && (
          <div className="space-y-4">
            {isOwner ? (
              <div className="flex flex-wrap gap-2">
                <Link to="/posts" className="primary-btn">
                  <Notebook size={16} className="me-1" /> Ses posts
                </Link>
              </div>
            ) : null}

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

            {(majorStatus === 'collecting' || majorStatus === 'closed') && (
              <div className="card-surface p-4 text-amber-700 text-sm space-y-2">
                {majorStatus === 'collecting' ? (
                  <>
                    <p>تخصصك في وضع التجميع. التسجيل متاح والنشر غير متاح حالياً.</p>
                    <p>عدد المسجلين الحالي: {majorPreregCount} / {majorThreshold}</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100">
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: `${Math.min(100, majorThreshold > 0 ? (majorPreregCount / majorThreshold) * 100 : 0)}%` }}
                      />
                    </div>
                    {majorThreshold > 0 && majorPreregCount >= majorThreshold && (
                      <p className="text-emerald-700">Threshold reached. Posting is now enabled.</p>
                    )}
                  </>
                ) : (
                  <p>هذا التخصص مغلق حالياً.</p>
                )}
              </div>
            )}

            {!!remainingDisplaySubjects.length && (
              <div className="card-surface p-4">
                <h3 className="font-semibold text-slate-900 mb-2">مواد متبقية من السنة الماضية</h3>
                <div className="flex flex-wrap gap-2">
                  {remainingDisplaySubjects.map((subject) => (
                    <span key={subject.id} className="badge-soft" title={subject.label}>
                      {subject.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isOwner && shouldAskRemaining && (
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
                      <div className="text-xs text-slate-500">{academicSettings.academicTermType === 'odd' ? 'Odd semesters: S1/S3/S5' : 'Even semesters: S2/S4/S6'}</div>
                    )}

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
                                <span className="font-semibold">{subject.nameFr || subject.nameAr || subject.name || 'Matière'}</span>
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
        )}

        {activeTab === 'resources' && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
            <h3 className="text-base font-semibold text-slate-800">Resources</h3>
            <p className="mt-2 text-sm">Resource content will appear here.</p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
            <h3 className="text-base font-semibold text-slate-800">Reviews</h3>
            <p className="mt-2 text-sm">Private reviews UI placeholder.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProfilePage;
