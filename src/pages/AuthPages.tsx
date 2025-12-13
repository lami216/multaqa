import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, UserPlus } from 'lucide-react';

export const AuthLayout: React.FC<{ title: string; children: React.ReactNode; subtitle?: string }> = ({ title, children, subtitle }) => (
  <div className="min-h-[70vh] flex items-center justify-center">
    <div className="card-surface w-full max-w-md p-6 space-y-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">M</div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle ? <p className="helper-text">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  </div>
);

export const LoginPage: React.FC = () => (
  <AuthLayout title="Connexion" subtitle="Rejoignez vos partenaires de travail en quelques secondes">
    <form className="space-y-3">
      <div className="text-left">
        <label className="text-sm font-semibold text-slate-700">Email</label>
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Mail size={16} className="text-slate-400" />
          <input className="flex-1 border-none focus:ring-0" placeholder="email@exemple.com" type="email" />
        </div>
      </div>
      <div className="text-left">
        <label className="text-sm font-semibold text-slate-700">Mot de passe</label>
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Lock size={16} className="text-slate-400" />
          <input className="flex-1 border-none focus:ring-0" placeholder="********" type="password" />
        </div>
      </div>
      <button className="primary-btn w-full" type="submit">Se connecter</button>
      <div className="flex justify-between text-sm text-slate-600">
        <Link to="/register" className="text-emerald-700 font-semibold">Créer un compte</Link>
        <Link to="/forgot" className="text-emerald-700 font-semibold">Mot de passe oublié</Link>
      </div>
    </form>
  </AuthLayout>
);

export const RegisterPage: React.FC = () => (
  <AuthLayout title="Créer un compte" subtitle="Organisez vos études avec Multaqa">
    <form className="space-y-3">
      <div className="text-left">
        <label className="text-sm font-semibold text-slate-700">Nom complet</label>
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <UserPlus size={16} className="text-slate-400" />
          <input className="flex-1 border-none focus:ring-0" placeholder="Votre nom" />
        </div>
      </div>
      <div className="text-left">
        <label className="text-sm font-semibold text-slate-700">Email</label>
        <input className="w-full mt-1" placeholder="email@exemple.com" type="email" />
      </div>
      <div className="text-left">
        <label className="text-sm font-semibold text-slate-700">Mot de passe</label>
        <input className="w-full mt-1" placeholder="********" type="password" />
      </div>
      <button className="primary-btn w-full" type="submit">S'inscrire</button>
      <p className="text-sm text-slate-600">
        Déjà inscrit ? <Link to="/login" className="text-emerald-700 font-semibold">Connexion</Link>
      </p>
    </form>
  </AuthLayout>
);

export const ForgotPasswordPage: React.FC = () => (
  <AuthLayout title="Mot de passe oublié" subtitle="Recevez un lien pour réinitialiser votre mot de passe">
    <form className="space-y-3">
      <div className="text-left">
        <label className="text-sm font-semibold text-slate-700">Email</label>
        <input className="w-full mt-1" placeholder="email@exemple.com" type="email" />
      </div>
      <button className="primary-btn w-full" type="submit">Envoyer le lien</button>
      <Link to="/login" className="text-emerald-700 font-semibold text-sm block">Retour à la connexion</Link>
    </form>
  </AuthLayout>
);

export const ResetPasswordPage: React.FC = () => (
  <AuthLayout title="Réinitialiser le mot de passe" subtitle="Choisissez un nouveau mot de passe sécurisé">
    <form className="space-y-3">
      <div className="text-left">
        <label className="text-sm font-semibold text-slate-700">Nouveau mot de passe</label>
        <input className="w-full mt-1" type="password" placeholder="********" />
      </div>
      <div className="text-left">
        <label className="text-sm font-semibold text-slate-700">Confirmer le mot de passe</label>
        <input className="w-full mt-1" type="password" placeholder="********" />
      </div>
      <button className="primary-btn w-full" type="submit">Mettre à jour</button>
    </form>
  </AuthLayout>
);
