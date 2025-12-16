import React, { useEffect, useState } from 'react';
import { Edit3, GraduationCap, MapPin, Notebook, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { http, type Profile } from '../lib/http';
import { appendCacheBuster } from '../lib/imageUtils';

const ProfilePage: React.FC = () => {
  const { user, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarVersion, setAvatarVersion] = useState<string | number>(() => Date.now());

  useEffect(() => {
    const load = async () => {
      if (!user?.username) return;
      const { data } = await http.get<{ user: unknown; profile: Profile; posts: unknown }>(`/users/${user.username}`);
      setProfile(data.profile);
      setAvatarVersion(data.profile.avatarFileId ?? Date.now());
    };

    void load();
  }, [user?.username]);

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
      setAvatarVersion(authProfile.avatarFileId ?? Date.now());
    }
  }, [authProfile]);

  const avatarSrc = profile?.avatarUrl ? appendCacheBuster(profile.avatarUrl, avatarVersion) : '';

  return (
    <div className="space-y-4">
      <div className="card-surface p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-3xl font-bold overflow-hidden">
            {avatarSrc ? <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" /> : <User />}
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">{profile?.displayName ?? user?.username}</h1>
            <p className="text-slate-600 flex items-center gap-2 text-sm">
              <GraduationCap size={16} /> {profile?.faculty ?? 'Faculté non renseignée'} · {profile?.level ?? 'Niveau libre'}
            </p>
            <p className="text-slate-700 leading-relaxed text-sm">{profile?.bio ?? 'Ajoutez une bio pour présenter votre parcours.'}</p>
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
              {(profile?.skills ?? []).map((skill) => (
                <span key={skill} className="badge-soft">{skill}</span>
              ))}
              {!profile?.skills?.length && <span className="text-sm text-slate-500">Aucune compétence déclarée.</span>}
            </div>
          </div>
          <div className="card-surface p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Matières suivies</h3>
            <div className="flex flex-wrap gap-2">
              {(profile?.courses ?? []).map((subject) => (
                <span key={subject} className="badge-soft">{subject}</span>
              ))}
              {!profile?.courses?.length && <span className="text-sm text-slate-500">Ajoutez vos matières suivies.</span>}
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
