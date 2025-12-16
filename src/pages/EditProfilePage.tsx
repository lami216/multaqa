import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { http, type Profile } from '../lib/http';
import { appendCacheBuster, prepareImageForUpload } from '../lib/imageUtils';
import { imagekitClient } from '../lib/imagekitClient';

const EditProfilePage: React.FC = () => {
  const { profile, setProfile } = useAuth();
  const [form, setForm] = useState<Profile>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadAttemptRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await http.get<{ user: unknown; profile: Profile }>('/auth/me');
      setForm(data.profile ?? {});
      setProfile(data.profile ?? null);
      setAvatarPreview(null);
      setAvatarVersion(data.profile?.avatarFileId ?? Date.now());
    };

    void load();
  }, [setProfile]);

  useEffect(() => {
    if (profile) {
      setForm(profile);
      setAvatarPreview(null);
      setAvatarVersion(profile.avatarFileId ?? Date.now());
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleChange = (field: keyof Profile, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const { data } = await http.patch<{ profile: Profile }>('/users/me', {
      displayName: form.displayName,
      faculty: form.faculty,
      major: form.major,
      level: form.level,
      skills: form.skills ?? [],
      courses: form.courses ?? [],
      availability: form.availability,
      languages: form.languages ?? [],
      bio: form.bio,
    });
    if (data?.profile) {
      setForm(data.profile);
      setProfile(data.profile);
      setAvatarVersion(data.profile.avatarFileId ?? Date.now());
    }
    setMessage('Profil mis à jour');
    setSaving(false);
  };

  const handleAvatarSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadAttemptRef.current += 1;
    const currentAttempt = uploadAttemptRef.current;

    setError('');
    setMessage('');
    setUploadingAvatar(true);

    try {
      const prepared = await prepareImageForUpload(file);

      if (uploadAttemptRef.current !== currentAttempt) return;

      setAvatarPreview(prepared.previewUrl);

      const extension = prepared.file.type.split('/')[1] ?? 'jpg';
      const uploadResponse = await imagekitClient.upload({
        file: prepared.file,
        fileName: `avatar_${Date.now()}.${extension}`,
        folder: '/avatars',
        tags: ['avatar'],
        useUniqueFileName: true
      });

      if (uploadAttemptRef.current !== currentAttempt) return;

      const avatarUrl = uploadResponse.url;
      const { data } = await http.post<{ profile: Profile }>('/users/avatar', {
        avatarUrl,
        avatarFileId: uploadResponse.fileId,
        mimeType: prepared.file.type
      });

      setForm((prev) => ({ ...prev, avatarUrl, avatarFileId: uploadResponse.fileId }));
      setProfile(data.profile ?? null);
      setAvatarVersion(data.profile?.avatarFileId ?? uploadResponse.fileId ?? Date.now());
      setMessage('Photo de profil mise à jour');
    } catch (err) {
      if (uploadAttemptRef.current === currentAttempt) {
        const message = axios.isAxiosError(err)
          ? err.response?.data?.error ?? 'Échec du chargement de l\'image.'
          : err instanceof Error
            ? err.message
            : 'Échec du chargement de l\'image.';
        setError(message);
      }
    } finally {
      if (uploadAttemptRef.current === currentAttempt) {
        setUploadingAvatar(false);
      }
      event.target.value = '';
    }
  };

  const avatarSrc = avatarPreview
    ? avatarPreview
    : form.avatarUrl
      ? appendCacheBuster(form.avatarUrl, avatarVersion)
      : '';

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase font-semibold text-emerald-600">Profil</p>
          <h1 className="section-title">Mettre à jour mon profil</h1>
          <p className="helper-text">Ajoutez vos compétences, matières et disponibilités pour de meilleurs matchs.</p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold overflow-hidden">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <Camera />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" className="secondary-btn" onClick={handleAvatarSelect} disabled={uploadingAvatar}>
              {uploadingAvatar ? <Loader2 className="me-2 animate-spin" size={16} /> : <Camera className="me-2" size={16} />}
              Télécharger une photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              capture="environment"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <p className="text-xs text-slate-500">JPEG, PNG ou WEBP · max 3MB · 512-2048px</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Nom d'affichage</label>
            <input value={form.displayName ?? ''} onChange={(e) => handleChange('displayName', e.target.value)} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Faculté</label>
            <input value={form.faculty ?? ''} onChange={(e) => handleChange('faculty', e.target.value)} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Niveau</label>
            <select value={form.level ?? ''} onChange={(e) => handleChange('level', e.target.value)} className="w-full mt-1">
              <option value="">Choisir</option>
              <option value="L1">Licence 1</option>
              <option value="L2">Licence 2</option>
              <option value="L3">Licence 3</option>
              <option value="M1">Master 1</option>
              <option value="M2">Master 2</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Compétences</label>
            <input value={(form.skills ?? []).join(', ')} onChange={(e) => handleChange('skills', e.target.value.split(',').map((v) => v.trim()))} className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Matières</label>
            <input value={(form.courses ?? []).join(', ')} onChange={(e) => handleChange('courses', e.target.value.split(',').map((v) => v.trim()))} className="w-full mt-1" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Bio</label>
          <textarea value={form.bio ?? ''} onChange={(e) => handleChange('bio', e.target.value)} rows={4} className="w-full mt-1" />
        </div>
        {message && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2">{message}</div>}
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">{error}</div>}
        <button type="submit" className="primary-btn w-full sm:w-auto" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
      </form>
    </div>
  );
};

export default EditProfilePage;
