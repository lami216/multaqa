import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import {
  fetchFaculties,
  fetchMajors,
  fetchSubjects,
  http,
  type FacultyItem,
  type MajorItem,
  type Profile,
  type SubjectItem
} from '../lib/http';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useAuth } from '../context/AuthContext';
import { processImageFile } from '../lib/imageProcessing';
import { uploadToImageKit } from '../lib/imagekitClient';

const EditProfilePage: React.FC = () => {
  const [form, setForm] = useState<Profile>({ subjects: [] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [facultiesError, setFacultiesError] = useState('');
  const [majorsError, setMajorsError] = useState('');
  const [subjectsError, setSubjectsError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [faculties, setFaculties] = useState<FacultyItem[]>([]);
  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const uploadTracker = useRef<number | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const previousObjectUrl = useRef<string | null>(null);
  const { user, profile, setProfile } = useAuth();
  const defaultLevelOptions = [
    { value: 'L1', label: 'Licence 1' },
    { value: 'L2', label: 'Licence 2' },
    { value: 'L3', label: 'Licence 3' },
    { value: 'M1', label: 'Master 1' },
    { value: 'M2', label: 'Master 2' }
  ];

  const getAvailableLevels = (facultyId?: string) => {
    if (!facultyId) return defaultLevelOptions;
    const faculty = faculties.find((item) => item._id === facultyId);
    if (faculty?.levels?.length) {
      return faculty.levels
        .map((value) => defaultLevelOptions.find((option) => option.value === value) ?? { value, label: value })
        .filter((option): option is { value: string; label: string } => Boolean(option));
    }
    return defaultLevelOptions;
  };

  const cacheBustedUrl = (url?: string, version?: string | number) => {
    if (!url) return undefined;
    const v = typeof version === 'number' ? version : version ? new Date(version).getTime() : Date.now();
    return `${url}?v=${v}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProfile(true);
        setLoadingFaculties(true);
        setFacultiesError('');
        const [{ data: meData }, { data: facultyData }] = await Promise.all([
          http.get<{ user: unknown; profile: Profile }>('/auth/me'),
          fetchFaculties(),
        ]);

        const nextProfile = {
          ...meData.profile,
          subjects: meData.profile?.subjects ?? [],
        } as Profile;

        setForm(nextProfile);
        setProfile(nextProfile ?? null);
        setFaculties(facultyData.faculties);
        setAvatarPreview(cacheBustedUrl(meData.profile?.avatarUrl, meData.profile?.updatedAt));
      } catch (err) {
        console.error('Failed to load profile or faculties', err);
        setFacultiesError('Échec du chargement des facultés. Merci de réessayer.');
        setError("Impossible de charger votre profil. Veuillez réessayer.");
      } finally {
        setLoadingProfile(false);
        setLoadingFaculties(false);
      }
    };

    void load();
  }, [setProfile]);

  useEffect(() => {
    if (!faculties.length) return;
    if (!form.facultyId) return;

    const hasFaculty = faculties.some((faculty) => faculty._id === form.facultyId);
    const availableLevels = getAvailableLevels(form.facultyId);
    const levelStillValid = availableLevels.some((option) => option.value === form.level);

    if (!hasFaculty || !levelStillValid) {
      setForm((prev) => ({ ...prev, facultyId: undefined, level: undefined, majorId: undefined, subjects: [], courses: [] }));
      setSubjects([]);
      setMajors([]);
      setError('La faculté ou le niveau enregistré n’est plus disponible. Merci de le sélectionner à nouveau.');
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
      setSubjects([]);
      setForm((prev) => ({ ...prev, majorId: undefined, subjects: [], courses: [] }));
      return;
    }

    const loadMajors = async () => {
      setLoadingMajors(true);
      setMajorsError('');
      try {
        const { data } = await fetchMajors({ facultyId: form.facultyId, level: form.level });
        const filteredMajors = data.majors.filter((major) => {
          if (!form.level) return true;
          if (major.levels?.length) return major.levels.includes(form.level);
          if (major.level) return major.level === form.level;
          return true;
        });

        setMajors(filteredMajors);
        const hasMajor = filteredMajors.some((major) => major._id === form.majorId);
        if (!hasMajor) {
          setForm((prev) => ({ ...prev, majorId: undefined, subjects: [], courses: [] }));
        }
      } catch (err) {
        console.error('Failed to load majors', err);
        setMajorsError('Impossible de charger les filières. Réessayez ou contactez un admin.');
      } finally {
        setLoadingMajors(false);
      }
    };

    void loadMajors();
  }, [form.facultyId, form.level, form.majorId]);

  useEffect(() => {
    if (!form.majorId) {
      setSubjects([]);
      setForm((prev) => ({ ...prev, subjects: [], courses: [] }));
      return;
    }

    const loadSubjects = async () => {
      setLoadingSubjects(true);
      setSubjectsError('');
      try {
        const { data } = await fetchSubjects({
          facultyId: form.facultyId ?? '',
          majorId: form.majorId,
          level: form.level,
        });
        setSubjects(data.subjects);
        setForm((prev) => ({
          ...prev,
          subjects: data.subjects.map((subject) => subject._id),
          courses: data.subjects.map((subject) => subject.nameFr),
        }));
      } catch (err) {
        console.error('Failed to load subjects', err);
        setSubjectsError('Impossible de charger les matières. Merci de réessayer.');
      } finally {
        setLoadingSubjects(false);
      }
    };

    void loadSubjects();
  }, [form.majorId, form.facultyId, form.level]);

  const handleChange = (field: keyof Profile, value: unknown) => {
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

    if (!form.facultyId || !form.level || !form.majorId || !(form.subjects?.length ?? 0)) {
      setError('Merci de sélectionner une faculté, un niveau, une filière et les matières associées.');
      setSaving(false);
      return;
    }

    try {
      const selectedFaculty = faculties.find((item) => item._id === form.facultyId);
      const selectedMajor = majors.find((item) => item._id === form.majorId);
      const selectedSubjects = subjects.filter((subject) => (form.subjects ?? []).includes(subject._id));

      const { data } = await http.patch<{ profile: Profile }>('/users/me', {
        displayName: form.displayName,
        facultyId: form.facultyId,
        faculty: selectedFaculty?.nameFr ?? '',
        level: form.level,
        majorId: form.majorId,
        major: selectedMajor?.nameFr ?? '',
        subjects: form.subjects,
        courses: selectedSubjects.map((subject) => subject.nameFr),
        availability: form.availability,
        languages: form.languages ?? [],
        bio: form.bio,
      });
      setProfile(data.profile ?? null);
      setMessage('Profil mis à jour');
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

      setForm((prev) => ({ ...prev, avatarUrl: uploadResponse.url, avatarFileId: uploadResponse.fileId }));
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

  const selectedSubjectItems = subjects.filter((subject) => (form.subjects ?? []).includes(subject._id));

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
              disabled={saving || loadingProfile}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Faculté</label>
            <select
              value={form.facultyId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setError('');
                setFacultiesError('');
                setMessage('');
                setForm((prev) => ({ ...prev, facultyId: value || undefined, level: undefined, majorId: undefined, subjects: [], courses: [] }));
              }}
              className="w-full mt-1"
              disabled={loadingFaculties || saving || loadingProfile}
            >
              <option value="">Choisir</option>
              {faculties.map((faculty) => (
                <option key={faculty._id} value={faculty._id}>
                  {faculty.nameFr}
                </option>
              ))}
            </select>
            {loadingFaculties && <p className="text-xs text-slate-500">Chargement des facultés...</p>}
            {facultiesError && <p className="text-xs text-red-600">{facultiesError}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Niveau</label>
            <select
              value={form.level ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setError('');
                setMajorsError('');
                setSubjectsError('');
                setMessage('');
                setForm((prev) => ({ ...prev, level: value || undefined, majorId: undefined, subjects: [], courses: [] }));
              }}
              className="w-full mt-1"
              disabled={!form.facultyId || saving || loadingProfile}
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
                setError('');
                setMajorsError('');
                setMessage('');
                setForm((prev) => ({ ...prev, majorId: value || undefined, subjects: [], courses: [] }));
              }}
              className="w-full mt-1"
              disabled={!form.facultyId || !form.level || saving || loadingMajors || loadingProfile}
            >
              <option value="">Choisir</option>
              {majors.map((major) => (
                <option key={major._id} value={major._id}>
                  {major.nameFr}
                </option>
              ))}
            </select>
            {loadingMajors && <p className="text-xs text-slate-500">Chargement des filières...</p>}
            {majorsError && <p className="text-xs text-red-600">{majorsError}</p>}
            {!loadingMajors && form.facultyId && form.level && !majors.length && (
              <p className="text-xs text-amber-600">Aucune filière active pour cette combinaison. Contactez un admin.</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Matières</label>
            <div className="mt-1 min-h-[42px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              {loadingSubjects && <p className="text-sm text-slate-600">Chargement des matières...</p>}
              {!loadingSubjects && !!selectedSubjectItems.length && (
                <div className="flex flex-wrap gap-2">
                  {selectedSubjectItems.map((subject) => (
                    <span key={subject._id} className="badge-soft">
                      {subject.nameFr}
                    </span>
                  ))}
                </div>
              )}
              {!loadingSubjects && !selectedSubjectItems.length && (
                <p className="text-sm text-slate-500">Choisissez une filière pour récupérer automatiquement les matières.</p>
              )}
              {subjectsError && <p className="text-xs text-red-600">{subjectsError}</p>}
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
            disabled={saving || loadingProfile}
          />
        </div>
        {message && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2">{message}</div>}
        <button
          type="submit"
          className="primary-btn w-full sm:w-auto"
          disabled={saving || loadingProfile || loadingSubjects || loadingMajors || loadingFaculties}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
};

export default EditProfilePage;
