import { Calendar, MapPin, Users } from 'lucide-react';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { markUnionReviewGoing, markUnionReviewView, type UnionReviewItem } from '../lib/http';
import UnionReviewCountdown from './UnionReviewCountdown';

const UnionReviewCard: React.FC<{ review: UnionReviewItem; onUpdate: (r: UnionReviewItem) => void; admin?: boolean }> = ({ review, onUpdate, admin }) => {
  const { language, t } = useLanguage();
  const isUnem = review.organizer === 'UNEM';
  const tone = isUnem ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70';
  const subjectLabel = language === 'ar'
    ? (review.subjectNameAr || review.subjectCode)
    : (review.subjectNameFr || review.subjectCode);
  const generatedTitle = language === 'ar' ? `مراجعة في مادة ${subjectLabel ?? ''}` : `Révision de ${subjectLabel ?? ''}`;
  return <div className={`rounded-3xl border p-4 shadow-sm ${tone}`} onMouseEnter={() => { void markUnionReviewView(review._id); }}>
    <div className="flex items-center justify-between gap-2"><span className={`badge-soft ${isUnem ? 'text-emerald-700' : 'text-amber-700'}`}>{review.organizer}</span><UnionReviewCountdown startsAt={review.startsAt} /></div>
    <h3 className="mt-2 text-lg font-black">{generatedTitle}</h3>
    <p className="text-sm text-slate-600">{subjectLabel}</p>
    <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2"><p>{review.facultyId}</p><p>{review.majorId} • {review.level}</p></div>
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span className="inline-flex items-center gap-1"><MapPin size={14} />{review.location}</span><span className="inline-flex items-center gap-1"><Calendar size={14} />{new Date(review.startsAt).toLocaleString()}</span></div>
    <div className="mt-3 flex items-center justify-between"><span className="inline-flex items-center gap-1 text-sm"><Users size={14} /> {review.goingCount}</span>{!admin && <button type="button" className="primary-btn" disabled={review.isGoing} onClick={async ()=>{const {data}=await markUnionReviewGoing(review._id); onUpdate({...review,...data.review,isGoing:true});}}>{t.unionReviews.attend}</button>}</div>
    {admin ? <p className="mt-2 text-xs text-slate-500">views: {review.viewsCount} • going: {review.goingCount}</p> : null}
  </div>;
};

export default UnionReviewCard;
