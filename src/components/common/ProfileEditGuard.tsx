import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProfileEditGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { loading, profile } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (profile?.profileLocked) {
    return <Navigate to="/profile" replace />;
  }

  return children;
};

export default ProfileEditGuard;
