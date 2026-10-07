import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { http, storeAccessToken } from '../lib/http';
export default function AccountSecurityPage() {
  const { user, refresh } = useAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [providers, setProviders] = useState<Record<string, boolean>>({}),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState('');
  useEffect(() => {
    http
      .get('/auth/providers')
      .then((r) => setProviders(r.data))
      .catch(() =>
        setMessage(ar ? 'تعذر تحميل طرق الدخول.' : 'Chargement indisponible.')
      );
  }, [ar]);
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);
  const failure = (error: unknown) => {
    const status = (error as { response?: { status: number } }).response
      ?.status;
    setMessage(
      status === 403
        ? ar
          ? 'أعد تسجيل الدخول بالحساب نفسه قبل تعديل طرق الدخول.'
          : 'Reconnectez-vous au même compte avant de modifier ses accès.'
        : status === 409
          ? ar
            ? 'تعارض في الربط، أو تحاول حذف آخر طريقة دخول متاحة.'
            : 'Association impossible ou dernier accès utilisable.'
          : ar
            ? 'تعذر تنفيذ الطلب. حاول لاحقًا.'
            : 'Action indisponible. Réessayez plus tard.'
    );
  };
  const link = async (p: string) => {
    setBusy(true);
    setMessage('');
    try {
      const { data } = await http.post<{ url: string }>(`/auth/${p}/link`);
      window.location.assign(data.url);
    } catch (e) {
      failure(e);
      setBusy(false);
    }
  };
  const unlink = async (p: string) => {
    if (
      !window.confirm(
        ar
          ? 'إلغاء وسيلة الدخول هذه؟ ستحتاج لتسجيل الدخول مجددًا.'
          : 'Retirer cet accès et vous reconnecter ?'
      )
    )
      return;
    setBusy(true);
    try {
      await http.delete(`/auth/${p}/link`);
      storeAccessToken(null);
      window.location.assign('/login');
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  };
  const addEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await http.post('/auth/email', { email });
      await refresh();
      setMessage(
        ar
          ? 'أضفنا البريد. أكّده قبل استخدامه لاسترجاع الحساب.'
          : 'Email ajouté. Confirmez-le avant la récupération du compte.'
      );
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  };
  const openBot = async () => {
    setBusy(true);
    try {
      const { data } = await http.get<{ url: string }>('/telegram/bot');
      window.location.assign(data.url);
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    setBusy(true);
    try {
      await http.delete('/telegram/link');
      await refresh();
      setMessage(
        ar
          ? 'أوقفنا الإشعارات فقط؛ الدخول بتيليغرام لم يتغير.'
          : 'Notifications désactivées. Votre accès Telegram reste intact.'
      );
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main
      className="max-w-2xl mx-auto card-surface p-6 space-y-6"
      dir={ar ? 'rtl' : 'ltr'}
    >
      <h1 className="text-2xl font-bold">
        {ar ? 'أمان الحساب وطرق الدخول' : 'Sécurité et connexions'}
      </h1>
      <p>
        {ar
          ? 'لا نربط حسابين تلقائيًا لمجرد تطابق البريد. أضف طرق الدخول من حسابك الحالي.'
          : 'Aucun rapprochement automatique par email. Ajoutez les accès depuis votre compte actuel.'}
      </p>
      <Link to="/login?reauth=1" className="secondary-btn">
        {ar ? 'إعادة إثبات ملكية الحساب' : 'Confirmer à nouveau mon identité'}
      </Link>
      <section className="space-y-3">
        <h2 className="font-bold">{ar ? 'البريد' : 'Email'}</h2>
        {user?.email ? (
          <>
            <p dir="ltr">{user.email}</p>
            <p>
              {user.emailVerified
                ? ar
                  ? 'مؤكد، ويمكن استعماله لاسترجاع الحساب.'
                  : 'Confirmé, utilisable pour récupérer le compte.'
                : ar
                  ? 'غير مؤكد؛ لا يمكن استعماله لاسترجاع الحساب بعد.'
                  : 'Non confirmé, récupération indisponible.'}
            </p>
            {!user.emailVerified && (
              <Link to="/verify-email" className="secondary-btn">
                {ar ? 'تأكيد البريد' : 'Confirmer cet email'}
              </Link>
            )}
          </>
        ) : (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => void addEmail(event)}
          >
            <input
              aria-label={ar ? 'بريد اختياري' : 'Email facultatif'}
              type="email"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
            />
            <button className="secondary-btn" disabled={busy}>
              {ar ? 'إضافة بريد اختياري' : 'Ajouter un email facultatif'}
            </button>
          </form>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-bold">
          {ar ? 'طرق الدخول' : 'Méthodes de connexion'}
        </h2>
        {(['google', 'telegram'] as const).map((p) => (
          <div
            key={p}
            className="flex items-center justify-between gap-3 border rounded-xl p-3"
          >
            <span>
              {p === 'google' ? 'Google' : 'Telegram'} —{' '}
              {user?.loginMethods?.[p]
                ? ar
                  ? 'مربوط'
                  : 'Associé'
                : ar
                  ? 'غير مربوط'
                  : 'Non associé'}
            </span>
            {user?.loginMethods?.[p] ? (
              <button
                disabled={busy}
                className="secondary-btn"
                onClick={() => void unlink(p)}
              >
                {ar ? 'إلغاء وسيلة الدخول' : 'Retirer cet accès'}
              </button>
            ) : providers[p] ? (
              <button
                disabled={busy}
                className="secondary-btn"
                onClick={() => void link(p)}
              >
                {ar ? 'ربط' : 'Associer'}
              </button>
            ) : (
              <small>{ar ? 'غير مهيأ بعد' : 'Pas encore configuré'}</small>
            )}
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-bold">
          {ar ? 'إشعارات بوت ملتقى' : 'Notifications du bot Multaqa'}
        </h2>
        <p>
          {user?.telegramNotificationsEnabled
            ? ar
              ? 'الإشعارات مفعلة.'
              : 'Notifications actives.'
            : ar
              ? 'الإشعارات غير مفعلة.'
              : 'Notifications inactives.'}
        </p>
        {user?.loginMethods?.telegram ? (
          <>
            <p>
              {ar
                ? 'حساب تيليغرام مربوط بالفعل. افتح البوت واضغط بدء أو أرسل /start لتفعيل الإشعارات، دون أي كود.'
                : 'Votre identité est déjà associée. Ouvrez le bot puis appuyez sur Start ou envoyez /start, sans aucun code.'}
            </p>
            <button
              className="primary-btn"
              disabled={busy}
              onClick={() => void openBot()}
            >
              {ar ? 'فتح بوت ملتقى' : 'Ouvrir le bot Multaqa'}
            </button>
          </>
        ) : (
          <p>
            {ar
              ? 'اربط تيليغرام أعلاه لتفعيل البوت دون نسخ أكواد.'
              : 'Associez Telegram ci-dessus pour activer le bot sans copier de code.'}
          </p>
        )}
        {user?.telegramNotificationsEnabled && (
          <button
            className="secondary-btn"
            disabled={busy}
            onClick={() => void disable()}
          >
            {ar
              ? 'إيقاف الإشعارات فقط'
              : 'Désactiver uniquement les notifications'}
          </button>
        )}
      </section>
      {message && (
        <p role="status" className="rounded-xl bg-slate-100 p-3">
          {message}
        </p>
      )}
      <Link to="/profile/edit" className="secondary-btn">
        {ar ? 'استكمال معلوماتي الدراسية' : 'Compléter mon profil étudiant'}
      </Link>
    </main>
  );
}
