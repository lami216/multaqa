import React, { useEffect, useState } from 'react';
import { http } from '../../lib/http';
import { useLanguage } from '../../context/LanguageContext';
export default function SocialLoginButtons() {
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  const { language } = useLanguage();
  const ar = language === 'ar';
  useEffect(() => {
    http
      .get('/auth/providers')
      .then((r) => setProviders(r.data))
      .catch(() =>
        setError(
          ar
            ? 'تعذر تحميل طرق الدخول. حاول مجددًا.'
            : 'Impossible de charger les connexions. Réessayez.'
        )
      );
  }, [ar]);
  const start = async (provider: string) => {
    setBusy(provider);
    setError('');
    try {
      const { data } = await http.post<{ url: string }>(
        `/auth/${provider}/start`
      );
      window.location.assign(data.url);
    } catch {
      setBusy('');
      setError(
        ar
          ? 'تعذر بدء الدخول. حاول مجددًا.'
          : 'Connexion indisponible. Réessayez.'
      );
    }
  };
  return (
    <div className="space-y-3">
      {(['google', 'telegram'] as const)
        .filter((p) => providers[p])
        .map((p) => (
          <button
            key={p}
            type="button"
            className="secondary-btn w-full justify-center"
            disabled={Boolean(busy)}
            onClick={() => void start(p)}
          >
            {busy === p
              ? ar
                ? 'جارٍ التحويل…'
                : 'Redirection…'
              : (ar ? 'المتابعة باستخدام ' : 'Continuer avec ') +
                (p === 'google' ? 'Google' : 'Telegram')}
          </button>
        ))}
      {providers.telegram && (
        <p className="text-xs text-slate-500">
          {ar
            ? 'يمكنك إنشاء حساب بتيليغرام دون بريد أو كلمة مرور.'
            : 'Un compte Telegram ne nécessite ni email ni mot de passe.'}
        </p>
      )}
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
