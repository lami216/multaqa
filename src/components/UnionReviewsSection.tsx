import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { fetchUnionReviews, type UnionReviewItem } from '../lib/http';
import UnionReviewCard from './UnionReviewCard';

const UnionReviewsSection: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const [reviews, setReviews] = useState<UnionReviewItem[]>([]);
  useEffect(() => { void fetchUnionReviews().then(({ data }) => setReviews(data.reviews ?? [])).catch(() => setReviews([])); }, []);
  if (!reviews.length) return null;
  return <section className="space-y-3" dir={isRtl ? 'rtl' : 'ltr'}><h2 className="text-xl font-black">{t.unionReviews.title}</h2><div className="grid gap-3">{reviews.map((r)=><UnionReviewCard key={r._id} review={r} onUpdate={(u)=>setReviews((prev)=>prev.map((p)=>p._id===u._id?u:p))} />)}</div></section>;
};

export default UnionReviewsSection;
