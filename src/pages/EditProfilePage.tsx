import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
import { http, type Profile } from '../lib/http';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useAuth } from '../context/AuthContext';
import { processImageFile } from '../lib/imageProcessing';
import { uploadToImageKit } from '../lib/imagekitClient';

const EditProfilePage: React.FC = () => {
  const [form, setForm] = useState<Profile>({ subjects: [], subjectCodes: [] });
  const [serverProfile, setServerProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [facultiesError, setFacultiesError] = useState('');
  const [majorsError, setMajorsError] = useState('');
  const [subjectsError, setSubjectsError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [faculties, setFaculties] = useState<CatalogFaculty[]>([]);
  const [majors, setMajors] = useState<CatalogMajor[]>([]);
  const [semesters, setSemesters] = useState<CatalogSemester[]>([]);
  const [subjects, setSubjects] = useState<CatalogSubject[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const initializedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const uploadTracker = useRef<number | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const previousObjectUrl = useRef<string | null>(null);
  const { user, profile, setProfile, refresh } = useAuth();
  const navigate = useNavigate();
  const isProfileLocked = Boolean(profile?.profileLocked);
  const getAvailableLevels = (facultyId?: string) =>
    (facultyId ? getLevelsByFaculty(facultyId) : []).map((level: CatalogLevel) => ({
      value: level.id,
      label: level.nameFr
    }));

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

  const normalizeProfileWithCatalog = (rawProfile?: Profile): Profile => {
    const catalogFaculties = getFaculties();
    const facultyMatch = matchByIdOrName(catalogFaculties, rawProfile?.facultyId ?? rawProfile?.faculty);

    const levels = facultyMatch ? getLevelsByFaculty(facultyMatch.id) : [];
    const levelMatch = matchByIdOrName(levels, rawProfile?.level);

    const majors = facultyMatch && levelMatch ? getMajorsByFacultyAndLevel(facultyMatch.id, levelMatch.id) : [];
    const majorMatch = matchByIdOrName(majors, rawProfile?.majorId ?? rawProfile?.major);

    const semesters =
      facultyMatch && levelMatch && majorMatch
        ? getSemestersByMajorAndLevel(facultyMatch.id, levelMatch.id, majorMatch.id)
        : [];
    const semesterMatch = matchByIdOrName(semesters, rawProfile?.semesterId ?? rawProfile?.semester);

    const catalogSubjects =
      facultyMatch && levelMatch && majorMatch && semesterMatch
        ? getSubjectsByMajorAndSemester(facultyMatch.id, levelMatch.id, majorMatch.id, semesterMatch.id)
        : [];

    const subjectCandidates = [...(rawProfile?.subjectCodes ?? []), ...(rawProfile?.subjects ?? [])].filter(Boolean);
    const matchedSubjectCodes = catalogSubjects
      .filter((subject) =>
        subjectCandidates.some(
          (candidate) =>
            candidate === subject.code ||
            candidate?.toLowerCase?.() === subject.nameFr.toLowerCase() ||
            candidate?.toLowerCase?.() === subject.nameAr.toLowerCase()
        )
      )
      .map((subject) => subject.code);

    const resolvedSubjectCodes = catalogSubjects.length
      ? matchedSubjectCodes.length
        ? matchedSubjectCodes
        : catalogSubjects.map((s) => s.code)
      : [];

    return {
      ...rawProfile,
      facultyId: facultyMatch?.id,
      level: levelMatch?.id,
      majorId: majorMatch?.id,
      semesterId: semesterMatch?.id,
      subjectCodes: resolvedSubjectCodes.length ? resolvedSubjectCodes : catalogSubjects.map((s) => s.code),
      subjects: resolvedSubjectCodes.length ? resolvedSubjectCodes : catalogSubjects.map((s) => s.code),
      courses: catalogSubjects.map((subject) => subject.nameFr)
    } as Profile;
  };

  const cacheBustedUrl = (url?: string, version?: string | number) => {
    if (!url) return undefined;
    const v = typeof version === 'number' ? version : version ? new Date(version).getTime() : Date.now();
    return `${url}?v=${v}`;
  };

  const syncServerProfile = (nextProfile: Profile, options?: { resetDirty?: boolean }) => {
    const shouldResetDirty = options?.resetDirty ?? false;
    setServerProfile(nextProfile);
    if (!initializedRef.current || !isDirtyRef.current || shouldResetDirty) {
      setForm((prev) => ({ ...prev, ...nextProfile }));
      if (shouldResetDirty) {
        isDirtyRef.current = false;
      }
    } else {
      console.info('[profile] skipped applying server profile because form is dirty');
    }
    initializedRef.current = true;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProfile(true);
        setFacultiesError('');
        const meStartedAt = Date.now();
        console.info('[profile] fetching /auth/me', { startedAt: new Date(meStartedAt).toISOString() });
        const { data: meData } = await http.get<{ user: unknown; profile: Profile }>('/auth/me');
        console.info('[profile] fetched /auth/me', { durationMs: Date.now() - meStartedAt });

        const nextProfile = {
          ...meData.profile,
          subjects: meData.profile?.subjects ?? meData.profile?.subjectCodes ?? [],
          subjectCodes: meData.profile?.subjectCodes ?? meData.profile?.subjects ?? [],
          semesterId: meData.profile?.semesterId ?? meData.profile?.semester
        } as Profile;

        const catalogFaculties = getFaculties();
        const normalizedProfile = normalizeProfileWithCatalog(nextProfile);

        setFaculties(catalogFaculties);
        syncServerProfile(normalizedProfile);
        setProfile(normalizedProfile ?? null);
        if (
          (nextProfile.facultyId || nextProfile.faculty || nextProfile.level) &&
          (!normalizedProfile.facultyId || !normalizedProfile.level)
        ) {
          setError(
            'Les informations enregistrées ne correspondent plus au catalogue académique. Merci de sélectionner vos données à nouveau.'
          );
        }
        setAvatarPreview(cacheBustedUrl(meData.profile?.avatarUrl, meData.profile?.updatedAt));
      } catch (err) {
        console.error('Failed to load profile or faculties', err);
        setFaculties(getFaculties());
        setFacultiesError('Échec du chargement de votre profil. Le catalogue local a été chargé.');
        setError("Impossible de charger votre profil. Veuillez réessayer.");
      } finally {
        setLoadingProfile(false);
      }
    };

    void load();
  }, [setProfile]);

  useEffect(() => {
    if (!loadingProfile && isProfileLocked) {
      toast.error('Votre profil est verrouillé.');
      navigate('/profile', { replace: true });
    }
  }, [isProfileLocked, loadingProfile, navigate]);

  useEffect(() => {
    if (serverProfile) {
      console.info('[profile] server profile synced', {
        facultyId: serverProfile.facultyId,
        level: serverProfile.level,
        majorId: serverProfile.majorId,
        semesterId: serverProfile.semesterId,
        updatedAt: serverProfile.updatedAt,
      });
    }
  }, [serverProfile]);

  useEffect(() => {
    if (!faculties.length || !form.facultyId) return;

    const faculty = faculties.find((item) => item.id === form.facultyId);
    if (!faculty) {
      setForm((prev) => ({
        ...prev,
        facultyId: undefined,
        level: undefined,
        majorId: undefined,
        semesterId: undefined,
        subjectCodes: [],
        subjects: [],
        courses: []
      }));
      setSubjects([]);
      setMajors([]);
      setSemesters([]);
      setError('La faculté sélectionnée n’est plus disponible dans le catalogue. Merci de choisir une autre faculté.');
      return;
    }

    const availableLevels = getAvailableLevels(form.facultyId);
    const levelStillValid = !form.level || availableLevels.some((option) => option.value === form.level);
    if (!levelStillValid) {
      setForm((prev) => ({
        ...prev,
        level: undefined,
        majorId: undefined,
        semesterId: undefined,
        subjectCodes: [],
        subjects: [],
        courses: []
      }));
      setSubjects([]);
      setMajors([]);
      setSemesters([]);
      setError('Le niveau enregistré n’est plus disponible pour cette faculté. Merci de le sélectionner à nouveau.');
    }
  }, [faculties, form.facultyId, form.level]);

  useEffect(() => {
    if (profile?.avatarUrl) {
      setAvatarPreview(cacheBustedUrl(profile.avatarUrl, profile.updatedAt));
    }
  }, [profile?.avatarUrl, profile?.updatedAt]);

  useEffect(() => {
    if (!form.facultyId || !form.level) {
      setMajors([]);
      setSemesters([]);
      setSubjects([]);
      setForm((prev) => ({ ...prev, majorId: undefined, semesterId: undefined, subjectCodes: [], subjects: [], courses: [] }));
      return;
    }

    setMajorsError('');
    const availableMajors = getMajorsByFacultyAndLevel(form.facultyId, form.level);
    setMajors(availableMajors);
    const hasMajor = availableMajors.some((major) => major.id === form.majorId);
    if (!hasMajor) {
      setForm((prev) => ({ ...prev, majorId: undefined, semesterId: undefined, subjectCodes: [], subjects: [], courses: [] }));
      setSemesters([]);
      setSubjects([]);
    }
    if (!availableMajors.length) {
      setMajorsError('Aucune filière active pour cette combinaison.');
    }
  }, [form.facultyId, form.level, form.majorId]);

  useEffect(() => {
    if (!form.majorId || !form.level || !form.facultyId) {
      setSemesters([]);
      setSubjects([]);
      setForm((prev) => ({ ...prev, semesterId: undefined, subjectCodes: [], subjects: [], courses: [] }));
      return;
    }

    const availableSemesters = getSemestersByMajorAndLevel(form.facultyId, form.level, form.majorId);
    setSemesters(availableSemesters);
    const hasSemester = availableSemesters.some((semester) => semester.id === form.semesterId);
    if (!hasSemester) {
      setForm((prev) => ({ ...prev, semesterId: undefined, subjectCodes: [], subjects: [], courses: [] }));
      setSubjects([]);
    }
  }, [form.majorId, form.facultyId, form.level, form.semesterId]);

  useEffect(() => {
    if (!form.majorId || !form.facultyId || !form.level || !form.semesterId) {
      setSubjects([]);
      setForm((prev) => ({ ...prev, subjectCodes: [], subjects: [], courses: [] }));
      return;
    }

    const nextSubjects = getSubjectsByMajorAndSemester(form.facultyId, form.level, form.majorId, form.semesterId);
    setSubjects(nextSubjects);
    setSubjectsError(nextSubjects.length ? '' : 'Aucune matière définie pour ce semestre.');
    setForm((prev) => ({
      ...prev,
      subjectCodes: nextSubjects.map((subject) => subject.code),
      subjects: nextSubjects.map((subject) => subject.code),
      courses: nextSubjects.map((subject) => subject.nameFr),
    }));
  }, [form.majorId, form.facultyId, form.level, form.semesterId]);

  const handleChange = (field: keyof Profile, value: unknown) => {
    isDirtyRef.current = true;
    setError('');
    setMessage('');
    setMajorsError('');
    setSubjectsError('');
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    if (isProfileLocked) {
      setError('Votre profil est verrouillé.');
      setSaving(false);
      return;
    }

    if (!form.facultyId || !form.level || !form.majorId || !form.semesterId || !(form.subjectCodes?.length ?? 0)) {
      setError('Merci de sélectionner une faculté, un niveau, une filière, un semestre et les matières associées.');
      setSaving(false);
      return;
    }

    try {
      const selectedFaculty = faculties.find((item) => item.id === form.facultyId);
      const selectedMajor = majors.find((item) => item.id === form.majorId);
      const selectedSemester = semesters.find((item) => item.id === form.semesterId);
      const selectedSubjects = subjects;

      const { data } = await http.patch<{ profile: Profile }>('/users/me', {
        displayName: form.displayName,
        facultyId: form.facultyId,
        faculty: selectedFaculty?.nameFr ?? '',
        level: form.level,
        majorId: form.majorId,
        major: selectedMajor?.nameFr ?? '',
        semesterId: form.semesterId,
        semester: selectedSemester?.nameFr ?? '',
        subjects: form.subjectCodes,
        subjectCodes: form.subjectCodes,
        courses: selectedSubjects.map((subject) => subject.nameFr),
        availability: form.availability,
        languages: form.languages ?? [],
        bio: form.bio,
      });
      if (data.profile) {
        syncServerProfile(data.profile, { resetDirty: true });
      }
      setProfile(data.profile ?? null);
      await refresh();
      setMessage('Profil mis à jour');
      navigate('/profile', { replace: true });
    } catch (err) {
      setError("Impossible d'enregistrer le profil. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  const revokePreview = () => {
    if (previousObjectUrl.current) {
      URL.revokeObjectURL(previousObjectUrl.current);
      previousObjectUrl.current = null;
    }
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPickerOpen(false);
    event.target.value = '';
    if (!file) return;

    const uploadId = Date.now();
    uploadTracker.current = uploadId;
    setAvatarError('');
    setAvatarUploading(true);

    try {
      const processed = await processImageFile(file);

      if (uploadTracker.current !== uploadId) return;

      revokePreview();
      previousObjectUrl.current = processed.previewUrl;
      setAvatarPreview(processed.previewUrl);

      const extension = processed.mimeType.split('/')[1] ?? 'jpg';
      const uploadResponse = await uploadToImageKit(
        processed.blob,
        `${user?.username ?? 'avatar'}-${uploadId}.${extension}`
      );

      if (uploadTracker.current !== uploadId) return;

      const { data } = await http.post<{ profile: Profile }>('/users/avatar', {
        avatarUrl: uploadResponse.url,
        avatarFileId: uploadResponse.fileId
      });

      isDirtyRef.current = true;
      setForm((prev) => ({ ...prev, avatarUrl: uploadResponse.url, avatarFileId: uploadResponse.fileId }));
      if (data.profile) {
        syncServerProfile(data.profile, { resetDirty: true });
      }
      setProfile(data.profile ?? null);
      revokePreview();
      setAvatarPreview(cacheBustedUrl(uploadResponse.url, Date.now()));
      setMessage('Avatar mis à jour');
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Erreur lors du téléchargement de la photo';
      setAvatarError(errMessage);
    } finally {
      if (uploadTracker.current === uploadId) {
        setAvatarUploading(false);
      }
    }
  };

  const openPicker = () => {
    setAvatarError('');
    setPickerOpen(true);
  };

  const handleSourceChoice = (source: 'camera' | 'gallery') => {
    setPickerOpen(false);
    if (source === 'camera') {
      cameraInputRef.current?.click();
    } else {
      galleryInputRef.current?.click();
    }
  };

  const uiLanguage = useMemo(() => (document.documentElement.lang?.toLowerCase().startsWith('ar') ? 'ar' : 'fr'), []);

  const selectedSubjectItems = subjects;

  useEffect(() => revokePreview, []);

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase font-semibold text-emerald-600">Profil</p>
          <h1 className="section-title">Mettre à jour mon profil</h1>
          <p className="helper-text">Mettez à jour votre parcours académique et vos disponibilités.</p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          <Avatar className="h-16 w-16 rounded-full border border-emerald-100">
            <AvatarImage src={avatarPreview} alt="Avatar" />
            <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold">
              {user?.username?.[0]?.toUpperCase() ?? <Camera />}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <button type="button" onClick={openPicker} className="secondary-btn" disabled={avatarUploading}>
                {avatarUploading ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Camera className="me-1" />} Choisir une photo
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleAvatarSelect}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
            {avatarUploading && <p className="text-xs text-emerald-700">Compression et envoi en cours...</p>}
            {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
          </div>
        </div>
        {pickerOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
            onClick={() => setPickerOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-sm font-semibold text-slate-800">Choisir une option</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="secondary-btn w-full"
                  onClick={() => handleSourceChoice('camera')}
                >
                  Prendre une photo
                </button>
                <button
                  type="button"
                  className="secondary-btn w-full"
                  onClick={() => handleSourceChoice('gallery')}
                >
                  Choisir depuis la galerie
                </button>
              </div>
              <button
                type="button"
                className="mt-3 w-full text-sm text-slate-500"
                onClick={() => setPickerOpen(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">{error}</div>}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Nom d'affichage</label>
            <input
              value={form.displayName ?? ''}
              onChange={(e) => handleChange('displayName', e.target.value)}
              className="w-full mt-1"
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Faculté</label>
            <select
              value={form.facultyId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                isDirtyRef.current = true;
                setError('');
                setFacultiesError('');
                setMessage('');
                setForm((prev) => ({
                  ...prev,
                  facultyId: value || undefined,
                  level: undefined,
                  majorId: undefined,
                  semesterId: undefined,
                  subjectCodes: [],
                  subjects: [],
                  courses: []
                }));
              }}
              className="w-full mt-1"
              disabled={saving}
            >
              <option value="">Choisir</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.nameFr}
                </option>
              ))}
            </select>
            {facultiesError && <p className="text-xs text-red-600">{facultiesError}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Niveau</label>
            <select
              value={form.level ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                isDirtyRef.current = true;
                setError('');
                setMajorsError('');
                setSubjectsError('');
                setMessage('');
                setForm((prev) => ({
                  ...prev,
                  level: value || undefined,
                  majorId: undefined,
                  semesterId: undefined,
                  subjectCodes: [],
                  subjects: [],
                  courses: []
                }));
              }}
              className="w-full mt-1"
              disabled={!form.facultyId || saving}
            >
              <option value="">Choisir</option>
              {getAvailableLevels(form.facultyId).map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            {!form.facultyId && <p className="text-xs text-slate-500">Sélectionnez d'abord une faculté.</p>}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Filière</label>
            <select
              value={form.majorId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                isDirtyRef.current = true;
                setError('');
                setMajorsError('');
                setMessage('');
                setForm((prev) => ({
                  ...prev,
                  majorId: value || undefined,
                  semesterId: undefined,
                  subjectCodes: [],
                  subjects: [],
                  courses: []
                }));
              }}
              className="w-full mt-1"
              disabled={!form.facultyId || !form.level || saving}
            >
              <option value="">Choisir</option>
              {majors.map((major) => (
                <option key={major.id} value={major.id}>
                  {major.nameFr}
                </option>
              ))}
            </select>
            {majorsError && <p className="text-xs text-red-600">{majorsError}</p>}
            {form.facultyId && form.level && !majors.length && (
              <p className="text-xs text-amber-600">Aucune filière active pour cette combinaison.</p>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Semestre</label>
            <select
              value={form.semesterId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                isDirtyRef.current = true;
                setError('');
                setSubjectsError('');
                setMessage('');
                setForm((prev) => ({
                  ...prev,
                  semesterId: value || undefined,
                  subjectCodes: [],
                  subjects: [],
                  courses: []
                }));
              }}
              className="w-full mt-1"
              disabled={!form.majorId || !form.level || saving}
            >
              <option value="">Choisir</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.nameFr}
                </option>
              ))}
            </select>
            {!form.majorId && <p className="text-xs text-slate-500">Sélectionnez d'abord une filière.</p>}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Matières</label>
            <div className="mt-1 min-h-[42px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              {!!selectedSubjectItems.length && (
                <div className="flex flex-wrap gap-2">
                  {selectedSubjectItems.map((subject) => (
                    <span
                      key={subject.code}
                      className="badge-soft"
                      title={uiLanguage === 'ar' ? subject.nameAr : subject.nameFr}
                    >
                      {subject.code}
                    </span>
                  ))}
                </div>
              )}
              {!selectedSubjectItems.length && (
                <p className="text-sm text-slate-500">Choisissez d'abord la filière et le semestre pour récupérer automatiquement les matières.</p>
              )}
              {subjectsError && <p className="text-xs text-red-600">{subjectsError}</p>}
              {!!selectedSubjectItems.length && (
                <p className="mt-1 text-xs text-slate-500">Les matières sont générées automatiquement à partir du catalogue académique.</p>
              )}
            </div>
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Bio</label>
          <textarea
            value={form.bio ?? ''}
            onChange={(e) => handleChange('bio', e.target.value)}
            rows={4}
            className="w-full mt-1"
            disabled={saving}
          />
        </div>
        {message && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2">{message}</div>}
        <button
          type="submit"
          className="primary-btn w-full sm:w-auto"
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
};

export default EditProfilePage;
