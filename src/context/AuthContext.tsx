import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ApiUser,
  Profile,
  fetchMe,
  loginRequest,
  logoutRequest,
  signupRequest
} from '../lib/http';

interface AuthContextValue {
  user: ApiUser | null;
  profile: Profile | null;
  loading: boolean;
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

  const loadUser = async () => {
    try {
      const { data } = await fetchMe();
      setUser(data.user);
      setProfile(data.profile ?? null);
    } catch (error) {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    await loginRequest({ email, password });
    await loadUser();
  };

  const signup = async (username: string, email: string, password: string) => {
    await signupRequest({ username, email, password });
    await loadUser();
  };

  const logout = async () => {
    await logoutRequest();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, logout, refresh: loadUser, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
