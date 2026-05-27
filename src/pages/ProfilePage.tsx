import { CheckCircle2, Copy, Edit3, GraduationCap, LogOut, MapPin, MessageCircle, Notebook, Send, Settings, Star, User, XCircle } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import SubjectBadge from '../components/subjects/SubjectBadge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  buildAcademicMajorKey,
  type CatalogFaculty,
  type CatalogLevel,
  type CatalogMajor,
  type CatalogSubject, 
  getCatalogSubjectByCode,
  getFaculties,
  getLevelsByFaculty,
  getMajorsByFacultyAndLevel,
  getSubjectsByMajorAndSemester,
  getSubjectsByMajorAndSemesters,
  getTermSemesterForLevel,
  isFacultyEnabled
} from '../lib/catalog';
import { type AcademicSettingsResponse, disconnectTelegramRequest, fetchAcademicSettings, generateTelegramLinkTokenRequest, http, type Profile, type RatingDistribution, type RemainingSubjectItem, type WrittenReviewItem, updateProfileSettingsRequest } from '../lib/http';
import { normalizeActivityPreferences, normalizeRolePreferences, parseLegacyPriorities } from '../lib/priorities';
import { buildSubjectInitials } from '../lib/subjectDisplay';

const ProfilePage: React.FC = () => {
  const { language, t } = useLanguage();
  const { user, profile: authProfile, refresh, currentUserId, logout, setProfile: setAuthProfile } = useAuth();
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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsDraft, setSettingsDraft] = useState({ displayName: '', bio: '', availability: '', language: 'Arabic' as 'Arabic' | 'French' });
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [telegramLinkModalOpen, setTelegramLinkModalOpen] = useState(false);
  const [telegramLinkData, setTelegramLinkData] = useState<{ token: string; botUsername: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false);
  const [writtenReviews, setWrittenReviews] = useState<WrittenReviewItem[]>([]);
  const [ratingDistribution, setRatingDistribution] = useState<RatingDistribution>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [academicSettings, setAcademicSettings] = useState<AcademicSettingsResponse>({
    academicTermType: 'odd',
    catalogVisibility: { faculties: {}, majors: {} },
    preregCounts: {},
    majorAvailability: {}
  });

  const handleTelegramLink = async () => {
    if (linkingTelegram || user?.telegramLinked) return;
    setLinkingTelegram(true);
    try {
      const { data } = await generateTelegramLinkTokenRequest();
      const { token, botUsername } = data;
      if (!botUsername) {
        setSettingsError(t.profile.telegramLinkError);
        return;
      }
      setTelegramLinkData({ token, botUsername });
      setTelegramLinkModalOpen(true);
      setCopySuccess(false);
    } catch {
      setSettingsError(t.profile.telegramLinkError);
    } finally {
      setLinkingTelegram(false);
    }
  };

  const telegramStartCommand = telegramLinkData ? `/start ${telegramLinkData.token}` : '';
  const telegramDeepLink = telegramLinkData
    ? `https://t.me/${telegramLinkData.botUsername}?start=${encodeURIComponent(telegramLinkData.token)}`
    : '';

  const handleCopyTelegramCommand = async () => {
    if (!telegramStartCommand) return;
    try {
      await navigator.clipboard.writeText(telegramStartCommand);
      setCopySuccess(true);
    } catch (error) {
      console.error('Failed to copy Telegram command', error);
      setCopySuccess(false);
    }
  };

  const openSettings = () => {
    setSettingsDraft({
      displayName: profile?.displayName ?? '',
      bio: profile?.bio ?? '',
      availability: profile?.availability ?? '',
      language: (profile?.languages?.[0] === 'French' ? 'French' : 'Arabic')
    });
    setSettingsMessage('');
    setSettingsError('');
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMessage('');
    setSettingsError('');
    try {
      const { data } = await updateProfileSettingsRequest({
        displayName: settingsDraft.displayName.trim(),
        bio: settingsDraft.bio.trim(),
        availability: settingsDraft.availability.trim(),
        languages: [settingsDraft.language]
      });
      setProfile((prev) => ({ ...(prev ?? {}), ...data.profile, userId: currentUserId }));
      setAuthProfile(data.profile);
      setSettingsMessage(t.profile.saved);
      await refresh();
    } catch {
      setSettingsError(t.profile.settingsError);
    } finally {
      setSettingsSaving(false);
    }
  };

  const disconnectTelegram = async () => {
    setDisconnectingTelegram(true);
    try {
      setSettingsError('');
      await disconnectTelegramRequest();
      await refresh();
    } catch {
      setSettingsError(t.profile.telegramDisconnectError);
    } finally {
      setDisconnectingTelegram(false);
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
        http.get<{ user: { id: string; averageRating?: number; totalReviews?: number; sessionsCount?: number }; profile: Profile; posts: unknown; ratingDistribution?: RatingDistribution; writtenReviews?: WrittenReviewItem[] }>(profileEndpoint, {
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
      const normalizedWrittenReviews = (data.writtenReviews ?? [])
        .map((item) => {
          const rawReview = (item as { review?: string; comment?: string; text?: string }).review
            ?? (item as { comment?: string }).comment
            ?? (item as { text?: string }).text
            ?? '';
          return {
            ...item,
            review: typeof rawReview === 'string' ? rawReview.trim() : ''
          };
        })
        .filter((item) => item.review);
      setWrittenReviews(normalizedWrittenReviews);
      setRatingDistribution(data.ratingDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
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
  const prioritySet = new Set((profile?.subjectsSettings ?? []).filter((item) => item.isPriority).map((item) => item.subjectCode));
  const courseLabels = (profile?.courses?.length
    ? profile.courses.map((label) => ({ label, code: label, isImportant: false }))
    : resolvedSubjectNames.map((label, index) => ({ label, code: catalogSubjects[index]?.code ?? label, isImportant: prioritySet.has(catalogSubjects[index]?.code ?? '') })));
  const normalizedPreferences = parseLegacyPriorities(profile?.prioritiesOrder);
  const rolePreferences = normalizeRolePreferences(profile?.rolePreferences ?? normalizedPreferences.rolePreferences);
  const activityPreferences = normalizeActivityPreferences(profile?.activityPreferences ?? normalizedPreferences.activityPreferences);
  const roleLabels = language === 'ar'
    ? { need_help: 'أحتاج مساعدة', can_help: 'أستطيع المساعدة' }
    : { need_help: 'Besoin d’aide', can_help: 'Je peux aider' };
  const activityLabels = language === 'ar'
    ? { td: 'حل TD', archive: 'حل الأرشيف' }
    : { td: 'TD', archive: 'Archives / anciens sujets' };
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
  const avgRatingDisplay = Number(avgRating).toFixed(1);
  const writtenReviewsToRender = showAllReviews ? writtenReviews : writtenReviews.slice(0, 3);
  const shouldShowAllButton = writtenReviews.length > 3;
  const hasRatings = Object.values(ratingDistribution).some((count) => count > 0);

  return (
    <div className="space-y-6">
      <Dialog open={telegramLinkModalOpen} onOpenChange={setTelegramLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-2 text-start">
            <DialogTitle className="text-slate-900">{t.profile.telegramModalTitle}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-600">
              {t.profile.telegramModalDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-start">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-700">{t.profile.telegramBotName}</p>
              <p className="mt-1 font-mono text-slate-900" dir="ltr">
                @{telegramLinkData?.botUsername}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-700">{t.profile.telegramCommand}</p>
              <p className="mt-1 break-all font-mono text-slate-900" dir="ltr">
                {telegramStartCommand}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="secondary-btn" onClick={() => void handleCopyTelegramCommand()}>
                <Copy size={16} className="me-1" />
                {copySuccess ? t.profile.telegramCopied : t.profile.telegramCopy}
              </button>
              <a href={telegramDeepLink} className="primary-btn text-center" target="_blank" rel="noreferrer">
                <Send size={16} className="me-1" /> {t.profile.telegramOpen}
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="space-y-2 text-start">
            <DialogTitle className="text-2xl font-black text-slate-950">{t.profile.settingsTitle}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-600">
              {t.profile.settingsDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-slate-700">
                {t.profile.displayName}
                <input
                  value={settingsDraft.displayName}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, displayName: event.target.value }))}
                  className="w-full"
                  maxLength={80}
                />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-700">
                {t.profile.availability}
                <input
                  value={settingsDraft.availability}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, availability: event.target.value }))}
                  className="w-full"
                  maxLength={160}
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-bold text-slate-700">
              {t.profile.bio}
              <textarea
                value={settingsDraft.bio}
                onChange={(event) => setSettingsDraft((prev) => ({ ...prev, bio: event.target.value }))}
                className="min-h-28 w-full resize-none"
                maxLength={500}
              />
            </label>

            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{t.profile.academicInfo}</h3>
                  <p className="mt-1 text-sm text-slate-500">{t.profile.readOnlyAcademic}</p>
                </div>
                <span className="badge-soft bg-slate-100 text-slate-600 ring-slate-200">{t.profile.readOnly}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                <span>{facultyLabel}</span>
                <span>{levelLabel}</span>
                <span>{majorLabel}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-slate-700">
                {t.profile.languagePreference}
                <select
                  value={settingsDraft.language}
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, language: event.target.value as 'Arabic' | 'French' }))}
                  className="w-full"
                >
                  <option value="Arabic">{t.common.arabic}</option>
                  <option value="French">{t.common.french}</option>
                </select>
              </label>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <h3 className="font-bold text-slate-900">{t.profile.notificationPreferences}</h3>
                <p className="mt-2 text-sm text-slate-500">{t.profile.notificationsReadonly}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {user?.telegramLinked ? <CheckCircle2 className="text-emerald-600" /> : <XCircle className="text-slate-400" />}
                  <div>
                    <h3 className="font-bold text-slate-900">Telegram</h3>
                    <p className="text-sm text-slate-500">{user?.telegramLinked ? t.profile.telegramConnected : t.profile.telegram}</p>
                  </div>
                </div>
                {user?.telegramLinked ? (
                  <button type="button" className="secondary-btn" onClick={() => void disconnectTelegram()} disabled={disconnectingTelegram}>
                    {t.profile.disconnectTelegram}
                  </button>
                ) : (
                  <button type="button" className="secondary-btn" onClick={() => void handleTelegramLink()} disabled={linkingTelegram}>
                    {t.profile.telegram}
                  </button>
                )}
              </div>
            </div>

            {settingsMessage && <p className="text-sm font-semibold text-emerald-700">{settingsMessage}</p>}
            {settingsError && <p className="text-sm font-semibold text-red-600">{settingsError}</p>}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className="secondary-btn text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => void logout()}>
                <LogOut size={16} /> {t.profile.logout}
              </button>
              <div className="flex gap-2">
                <button type="button" className="secondary-btn" onClick={() => setSettingsOpen(false)}>{t.profile.cancel}</button>
                <button type="button" className="primary-btn" onClick={() => void saveSettings()} disabled={settingsSaving}>
                  {settingsSaving ? t.profile.saving : t.profile.saveSettings}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <section className="premium-panel overflow-hidden p-5 space-y-6 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-24 w-24 rounded-[2rem] border-4 border-white shadow-card">
              <AvatarImage src={avatarUrl} alt="Avatar" />
              <AvatarFallback className="bg-emerald-50 text-emerald-700 flex items-center justify-center text-3xl font-bold">
                {(profile?.displayName?.[0] ?? user?.username?.[0])?.toUpperCase() ?? <User />}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{profile?.displayName ?? (id ? undefined : user?.username)}</h1>
              <p className="text-slate-600 flex items-center gap-2 text-sm">
                <GraduationCap size={16} /> {facultyLabel} · {levelLabel} · {majorLabel}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{profile?.bio ?? t.profile.defaultBio}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner ? (
              <>
                {!profile?.profileLocked && (
                  <Link to="/profile/edit" className="secondary-btn">
                    <Edit3 size={16} /> {t.profile.edit}
                  </Link>
                )}
                <button type="button" className="secondary-btn" aria-label="Settings" onClick={openSettings}>
                  <Settings size={16} /> {t.profile.settings}
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
                <MessageCircle size={16} /> {t.profile.message}
              </button>
            ) : null}
            {isOwner ? (
              user?.telegramLinked ? (
                <span className="badge-soft bg-emerald-50 text-emerald-700 ring-emerald-100">
                  <CheckCircle2 size={14} /> {t.profile.telegramConnected}
                </span>
              ) : (
                <button type="button" className="secondary-btn" onClick={() => void handleTelegramLink()} disabled={linkingTelegram}>
                  {t.profile.telegram}
                </button>
              )
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{reviewsCount}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t.profile.reviews}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{sessionsCount}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t.profile.sessions}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 flex items-center justify-center gap-1">
              <Star size={16} className="fill-amber-400 text-amber-400" /> {avgRatingDisplay}
            </p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t.profile.rating}</p>
          </div>
        </div>
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
                    <SubjectBadge key={subject.code} label={subject.label} compactLabel={buildSubjectInitials(subject.label, subject.code)} isImportant={subject.isImportant} />
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
              <h3 className="font-semibold text-slate-900 mb-2">{language === 'ar' ? 'تفضيل الدور' : 'Préférence de rôle'}</h3>
              <div className="flex flex-wrap gap-2">
                {rolePreferences.map((item, index) => (
                  <span key={item} className="badge-soft bg-emerald-50 text-emerald-700">#{index + 1} {roleLabels[item]}</span>
                ))}
              </div>
            </div>
            <div className="card-surface p-4">
              <h3 className="font-semibold text-slate-900 mb-2">{language === 'ar' ? 'تفضيل النشاط' : 'Préférence d’activité'}</h3>
              <div className="flex flex-wrap gap-2">
                {activityPreferences.map((item, index) => (
                  <span key={item} className="badge-soft bg-emerald-50 text-emerald-700">#{index + 1} {activityLabels[item]}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              <MapPin size={16} /> {profile?.availability ?? 'Disponibilité à définir'}
            </div>
          </div>
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <header className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">{t.profile.studentReviewsTitle}</h2>
            <p className="text-sm text-slate-500">{t.profile.studentReviewsSubtitle}</p>
          </header>
          {hasRatings ? (
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star as 1 | 2 | 3 | 4 | 5] ?? 0;
                const width = reviewsCount > 0 ? Math.round((count / reviewsCount) * 100) : 0;
                return (
                  <div key={star} className="grid grid-cols-[58px_1fr_40px] items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-700">{star} ⭐</span>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${width}%` }} />
                    </div>
                    <span className="text-end font-semibold text-slate-700">{count}</span>
                  </div>
                );
              })}
              <p className="pt-2 text-sm font-semibold text-emerald-700">{t.profile.averageRatingLabel(avgRatingDisplay)}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">{t.profile.reviewsDistributionEmpty}</div>
          )}

          {writtenReviews.length ? (
            <div className="space-y-3">
              {writtenReviewsToRender.map((item, index) => (
                <article key={`${item.reviewer?.id ?? item.reviewer?.username ?? 'member'}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-emerald-50 text-emerald-700">{item.reviewer?.username?.slice(0, 1)?.toUpperCase() ?? 'M'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.reviewer?.username}</p>
                        <p className="text-xs text-slate-500">{[item.reviewer?.level, item.reviewer?.major].filter(Boolean).join(' · ') || t.profile.reviewerInfoFallback}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-amber-500">{item.score}★</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{item.review}</p>
                  {item.createdAt ? <p className="mt-2 text-xs text-slate-500">{new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : 'fr-FR').format(new Date(item.createdAt))}</p> : null}
                </article>
              ))}
              {shouldShowAllButton ? (
                <button type="button" className="secondary-btn w-full sm:w-auto" onClick={() => setShowAllReviews((prev) => !prev)}>
                  {showAllReviews ? t.profile.showLessReviews : t.profile.showAllReviews}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">{t.profile.reviewsEmpty}</div>
          )}
        </section>
      </section>
    </div>
  );
};

export default ProfilePage;
