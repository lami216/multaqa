import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { http } from '../lib/http';
export default function VerifyEmailPage() {
  const { user, refresh } = useAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [done, setDone] = useState(false),
    [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const confirm = async () => {
    setBusy(true);
    setMessage('');
    try {
      await http.post('/auth/verification/confirm', { token });
      setDone(true);
      setMessage(ar ? 'تم تأكيد البريد.' : 'Email confirmé.');
      await refresh();
    } catch {
      setMessage(
        ar
          ? 'الرابط غير صالح أو انتهت صلاحيته. اطلب رسالة جديدة من حسابك.'
          : 'Lien invalide ou expiré. Demandez un nouvel email depuis votre compte.'
      );
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setBusy(true);
    setMessage('');
    try {
      await http.post('/auth/verification/resend');
      setCooldown(60);
      setMessage(
        ar
          ? 'تم طلب رسالة تأكيد. تحقق من البريد والرسائل غير المرغوبة؛ الإرسال محدود لتجنب الإزعاج.'
          : 'Email demandé. Vérifiez votre boîte et les spams. Les envois sont limités.'
      );
    } catch {
      setMessage(
        ar
          ? 'تعذر طلب الرسالة أو بلغت الحد المسموح. حاول لاحقًا.'
          : 'Envoi indisponible ou limite atteinte. Réessayez plus tard.'
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main
      className="max-w-xl mx-auto my-12 card-surface p-8 space-y-5"
      dir={ar ? 'rtl' : 'ltr'}
    >
      <h1 className="text-2xl font-bold">
        {ar ? 'تأكيد البريد الإلكتروني' : 'Confirmer votre email'}
      </h1>
      <p>
        {ar
          ? 'نؤكد البريد مرة واحدة، وليس عند كل تسجيل دخول.'
          : 'Une confirmation unique, pas un email à chaque connexion.'}
      </p>
      {user?.email && <p dir="ltr">{user.email}</p>}
      {token && !done ? (
        <button
          className="primary-btn"
          disabled={busy}
          onClick={() => void confirm()}
        >
          {ar ? 'تأكيد البريد' : 'Confirmer cet email'}
        </button>
      ) : user && !user.emailVerified && user.email ? (
        <button
          className="primary-btn"
          disabled={busy || cooldown > 0}
          onClick={() => void resend()}
        >
          {cooldown
            ? `${cooldown}s`
            : ar
              ? 'إعادة إرسال رسالة التأكيد'
              : 'Renvoyer la confirmation'}
        </button>
      ) : null}
      {message && <p role="status">{message}</p>}
      {user ? (
        <div className="flex gap-4">
          <Link className="secondary-btn" to="/account">
            {ar ? 'إعدادات الحساب' : 'Sécurité du compte'}
          </Link>
          {user.identityVerified && (
            <Link className="primary-btn" to="/profile/edit">
              {ar ? 'متابعة واستكمال الملف' : 'Compléter mon profil'}
            </Link>
          )}
        </div>
      ) : (
        <Link className="primary-btn" to="/login">
          {ar ? 'تسجيل الدخول' : 'Se connecter'}
        </Link>
      )}
    </main>
  );
}
