import { CheckCircle2, MessageCircle, Star } from 'lucide-react';
import React from 'react';

interface TrustSnapshotProps {
  rating?: number;
  sessionsCount?: number;
  reviewsCount?: number;
  compact?: boolean;
  language: 'ar' | 'fr';
}

export const TrustSnapshot: React.FC<TrustSnapshotProps> = ({ rating = 0, sessionsCount = 0, reviewsCount = 0, compact = true, language }) => {
  const trustLabel = sessionsCount > 0 || reviewsCount > 0 ? (language === 'ar' ? 'عضو موثوق' : 'Membre fiable') : (language === 'ar' ? 'عضو جديد' : 'Nouveau membre');
  const safeRating = rating > 0 ? rating.toFixed(1) : '—';
  const items = [
    { icon: Star, label: `⭐ ${safeRating}` },
    { icon: CheckCircle2, label: sessionsCount > 0 ? `✅ ${sessionsCount}` : `✅ ${language === 'ar' ? 'جديد' : 'Nouveau'}` },
    { icon: MessageCircle, label: reviewsCount > 0 ? `💬 ${reviewsCount}` : `💬 ${language === 'ar' ? 'بدون مراجعات بعد' : 'Pas encore d’avis'}` }
  ];
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/80 p-3 ${compact ? '' : 'p-4'}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
        {items.map((item) => <span key={item.label} className="rounded-full bg-slate-100 px-2.5 py-1">{item.label}</span>)}
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">🟢 {trustLabel}</span>
      </div>
    </div>
  );
};
