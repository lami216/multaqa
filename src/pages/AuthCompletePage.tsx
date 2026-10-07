import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { http, storeAccessToken, fetchMe } from '../lib/http';
export default function AuthCompletePage() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    storeAccessToken(null);
    void (async () => {
      try {
        const { data } = await http.post<{ accessToken: string }>(
          '/auth/refresh'
        );
        storeAccessToken(data.accessToken);
        const me = await fetchMe();
        if (active)
          window.location.replace(
            me.data.profile?.displayName ? '/account' : '/profile/edit'
          );
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="max-w-xl mx-auto p-8">
      {failed ? (
        <>
          <p>تعذر إكمال الدخول / Connexion incomplète.</p>
          <Link to="/login" className="primary-btn">
            إعادة المحاولة / Réessayer
          </Link>
        </>
      ) : (
        <p>جارٍ إكمال الدخول… / Connexion en cours…</p>
      )}
    </main>
  );
}
