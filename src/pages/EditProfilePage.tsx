import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { http, type Profile } from '../lib/http';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useAuth } from '../context/AuthContext';
import { processImageFile } from '../lib/imageProcessing';
import { uploadToImageKit } from '../lib/imagekitClient';

const EditProfilePage: React.FC = () => {
  const [form, setForm] = useState<Profile>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const uploadTracker = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previousObjectUrl = useRef<string | null>(null);
  const { user, profile, setProfile } = useAuth();

  const cacheBustedUrl = (url?: string, version?: string | number) => {
    if (!url) return undefined;
    const v = typeof version === 'number' ? version : version ? new Date(version).getTime() : Date.now();
    return `${url}?v=${v}`;
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await http.get<{ user: unknown; profile: Profile }>('/auth/me');
      setForm(data.profile ?? {});
      setProfile(data.profile ?? null);
      setAvatarPreview(cacheBustedUrl(data.profile?.avatarUrl, data.profile?.updatedAt));
    };

    void load();
  }, [setProfile]);

  useEffect(() => {
    if (profile?.avatarUrl) {
      setAvatarPreview(cacheBustedUrl(profile.avatarUrl, profile.updatedAt));
    }
  }, [profile?.avatarUrl, profile?.updatedAt]);

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
    setProfile(data.profile ?? null);
    setMessage('Profil mis à jour');
    setSaving(false);
  };

  const revokePreview = () => {
    if (previousObjectUrl.current) {
      URL.revokeObjectURL(previousObjectUrl.current);
      previousObjectUrl.current = null;
    }
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    fileInputRef.current?.click();
  };

  useEffect(() => revokePreview, []);

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
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
            <p className="text-xs text-slate-500">JPG/PNG/WebP · Taille max 3MB. Caméra ou galerie.</p>
            {avatarUploading && <p className="text-xs text-emerald-700">Compression et envoi en cours...</p>}
            {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
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
        <button type="submit" className="primary-btn w-full sm:w-auto" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
      </form>
    </div>
  );
};

export default EditProfilePage;
