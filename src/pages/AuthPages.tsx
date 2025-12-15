import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Lock, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AuthLayout: React.FC<{ title: string; children: React.ReactNode; subtitle?: string }> = ({ title, children, subtitle }) => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="grid lg:grid-cols-2 w-full max-w-5xl rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-br from-emerald-50 to-white p-8 hidden lg:flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white text-emerald-700 flex items-center justify-center font-black shadow">
              M
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">Multaqa</p>
              <p className="text-sm text-slate-600">Rassemblement pour les étudiants motivés</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-10">{title}</h1>
          {subtitle ? <p className="text-slate-600 mt-3 max-w-xl">{subtitle}</p> : null}
        </div>
        <div className="text-sm text-slate-500">
          <p>Plateforme sécurisée • Données réelles • Communauté active</p>
        </div>
      </div>
      <div className="p-8 bg-white space-y-6">
        <div className="lg:hidden flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
            M
          </div>
          <div>
            <p className="text-lg font-extrabold text-slate-900">Multaqa</p>
            <p className="text-sm text-slate-600">Connectez-vous à votre campus</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  </div>
);

export const LoginPage: React.FC = () => {
  const { login, user } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const redirectPath = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError('Impossible de se connecter avec ces identifiants.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accédez aux vraies annonces et aux échanges étudiants sécurisés."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{error}</div>}
        <div className="text-start space-y-2">
          <label className="text-sm font-semibold text-slate-700">Email</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Mail size={16} className="text-slate-400" />
            <input
              className="flex-1 border-none focus:ring-0"
              placeholder="email@exemple.com"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
        </div>
        <div className="text-start space-y-2">
          <label className="text-sm font-semibold text-slate-700">Mot de passe</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Lock size={16} className="text-slate-400" />
            <input
              className="flex-1 border-none focus:ring-0"
              placeholder="********"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>
        </div>
        <button className="primary-btn w-full" type="submit" disabled={submitting}>
          {submitting ? 'Connexion...' : 'Se connecter'}
        </button>
        <p className="text-sm text-slate-600 text-center">
          Nouveau sur Multaqa ?{' '}
          <Link to="/signup" className="text-emerald-700 font-semibold">Créer un compte</Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export const SignupPage: React.FC = () => {
  const { signup, user } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signup(form.username, form.email, form.password);
    } catch (err) {
      setError("Impossible de créer le compte. Vérifiez l'email ou le mot de passe.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Rejoignez la plateforme officielle pour les collaborations étudiantes."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{error}</div>}
        <div className="text-start space-y-2">
          <label className="text-sm font-semibold text-slate-700">Nom d'utilisateur</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <UserPlus size={16} className="text-slate-400" />
            <input
              className="flex-1 border-none focus:ring-0"
              placeholder="ex: amina.el"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
          </div>
        </div>
        <div className="text-start space-y-2">
          <label className="text-sm font-semibold text-slate-700">Email</label>
          <input
            className="w-full mt-1"
            placeholder="email@exemple.com"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
        <div className="text-start space-y-2">
          <label className="text-sm font-semibold text-slate-700">Mot de passe</label>
          <input
            className="w-full mt-1"
            placeholder="********"
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>
        <button className="primary-btn w-full" type="submit" disabled={submitting}>
          {submitting ? 'Création...' : "S'inscrire"}
        </button>
        <p className="text-sm text-slate-600 text-center">
          Déjà inscrit ? <Link to="/login" className="text-emerald-700 font-semibold">Connexion</Link>
        </p>
      </form>
    </AuthLayout>
  );
};
