import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ApiUser,
  fetchMe,
  getStoredAccessToken,
  loginRequest,
  logoutRequest,
  signupRequest,
  storeAccessToken
} from '../lib/http';
import type { Profile } from '../lib/http';

interface AuthContextValue {
  user: ApiUser | null;
  profile: Profile | null;
  loading: boolean;
  currentUserId: string;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = (nextProfile: Profile | null) => {
    setProfile(nextProfile);
    setUser((prev) => (prev ? { ...prev, avatarUrl: nextProfile?.avatarUrl } : prev));
  };

  const loadUser = async (requireToken = false) => {
    const token = getStoredAccessToken();
    if (requireToken && !token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await fetchMe();
      setUser({ ...data.user, avatarUrl: data.profile?.avatarUrl });
      syncProfile(data.profile ?? null);
    } catch (error) {
      storeAccessToken(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUser(true);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await loginRequest({ email, password });
    storeAccessToken(data.accessToken ?? null);
    await loadUser(true);
  };

  const signup = async (username: string, email: string, password: string) => {
    const { data } = await signupRequest({ username, email, password });
    storeAccessToken(data.accessToken ?? null);
    await loadUser(true);
  };

  const logout = async () => {
    await logoutRequest();
    storeAccessToken(null);
    setUser(null);
    setProfile(null);
  };

  const currentUserId = user?.id ?? user?._id ?? '';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      currentUserId,
      login,
      signup,
      logout,
      refresh: loadUser,
      setProfile: syncProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
