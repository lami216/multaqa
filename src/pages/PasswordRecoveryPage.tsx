import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { http } from '../lib/http';
import { useLanguage } from '../context/LanguageContext';
export default function PasswordRecoveryPage() {
  const resetting = useLocation().pathname === '/reset-password';
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [email, setEmail] = useState(''),
    [token, setToken] = useState(
      () =>
        new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
    ),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [done, setDone] = useState(false);
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (resetting && new TextEncoder().encode(password).length > 72) {
      setMessage(ar ? 'كلمة المرور طويلة جدًا.' : 'Mot de passe trop long.');
      return;
    }
    setBusy(true);
    try {
      await http.post(
        resetting ? '/auth/reset-password' : '/auth/forgot-password',
        resetting ? { token, password } : { email }
      );
      setDone(true);
      setMessage(
        resetting
          ? ar
            ? 'تم تحديث كلمة المرور وإبطال الجلسات القديمة. سجل الدخول من جديد.'
            : 'Mot de passe modifié et anciennes sessions révoquées. Reconnectez-vous.'
          : ar
            ? 'إن كان البريد مؤكدًا وله حساب، ستصلك رسالة الاسترجاع.'
            : 'Si cet email est confirmé et associé à un compte, un message de récupération sera envoyé.'
      );
    } catch {
      setMessage(
        ar
          ? 'الطلب غير صالح أو انتهت صلاحيته، أو بلغت الحد المسموح.'
          : 'Demande invalide, expirée ou limite atteinte.'
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main
      className="max-w-xl mx-auto my-12 card-surface p-8 space-y-4"
      dir={ar ? 'rtl' : 'ltr'}
    >
      <h1 className="text-2xl font-bold">
        {ar ? 'استرجاع الحساب' : 'Récupérer mon compte'}
      </h1>
      {!done && (
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          {resetting ? (
            <>
              <label className="block">
                {ar ? 'رمز الاسترجاع' : 'Code de récupération'}
                <input
                  className="w-full"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  pattern="[a-fA-F0-9]{64}"
                  required
                />
              </label>
              <label className="block">
                {ar
                  ? 'كلمة مرور جديدة (10 أحرف على الأقل)'
                  : 'Nouveau mot de passe (10 caractères minimum)'}
                <input
                  className="w-full"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="block">
              Email
              <input
                className="w-full"
                type="email"
                maxLength={254}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <button className="primary-btn" disabled={busy}>
            {ar ? 'متابعة' : 'Continuer'}
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      <Link to="/login" className="secondary-btn">
        {ar ? 'تسجيل الدخول' : 'Se connecter'}
      </Link>
    </main>
  );
}
