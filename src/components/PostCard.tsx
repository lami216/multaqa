import React, { useState } from 'react';
import { ArrowUpRight, CalendarDays, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getCatalogSubjectByCode, getSubjectFullName, getSubjectShortNameByCode } from '../lib/catalog';
import type { PostResponse } from '../lib/http';
import { resolveAuthorId } from '../lib/postUtils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import CompatibilityDetailsDialog from './CompatibilityDetailsDialog';
import { TrustSnapshot } from './common/TrustSnapshot';
import SubjectBadge from './subjects/SubjectBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

const roleLabels: Record<string, { fr: string; ar: string }> = {
  need_help: { fr: 'Besoin d’aide', ar: 'أحتاج مساعدة' },
  can_help: { fr: 'Peut aider', ar: 'أستطيع المساعدة' },
};

const activityLabels: Record<string, { fr: string; ar: string }> = {
  general_review: { fr: 'Révision', ar: 'مراجعة عامة' },
  td: { fr: 'TD', ar: 'حل TD' },
  archive: { fr: 'Archives', ar: 'حل الأرشيف' },
};

const categoryLabel = (category: string) => category.replace(/_/g, ' ');

const getCompatibilityBadgeClass = (score: number) => {
  if (score >= 80) return 'bg-emerald-600 text-white ring-emerald-200';
  if (score >= 60) return 'bg-amber-400 text-slate-950 ring-amber-200';
  return 'bg-orange-500 text-white ring-orange-200';
};

interface PostCardProps {
  post: PostResponse;
  currentUserId?: string | null;
  showTags?: boolean;
  clampDescription?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  showTags = false,
  clampDescription = false,
}) => {
  const { language, t } = useLanguage();
  const { profile } = useAuth();
  const isAuthor = currentUserId ? resolveAuthorId(post) === currentUserId : false;
  const legacyPostRole = (post as { postRole?: string }).postRole;
  const normalizedRole = post.postRole === 'need_help' || post.postRole === 'can_help' ? post.postRole : undefined;
  const normalizedActivity = post.postActivity ?? (legacyPostRole === 'td' || legacyPostRole === 'archive' ? legacyPostRole : undefined);
  const roleLabel = normalizedRole ? roleLabels[normalizedRole]?.[language] ?? normalizedRole : t.post.notSpecified;
  const activityLabel = normalizedActivity ? activityLabels[normalizedActivity]?.[language] ?? normalizedActivity : t.post.notSpecified;
  const descriptionClassName = `text-sm leading-7 text-slate-600${clampDescription ? ' line-clamp-3' : ''}`;
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const prioritySet = new Set((profile?.subjectsSettings ?? []).filter((item) => item.isPriority).map((item) => item.subjectCode));
  const [isCompatibilityOpen, setIsCompatibilityOpen] = useState(false);
  const title = post.category === 'study_partner'
    ? (post.subjectCodes ?? []).map((subjectCode) => getSubjectFullName(subjectCode) || subjectCode).join(' · ') || post.title
    : post.title;

  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 p-4 shadow-card backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-hover sm:p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-slate-900 opacity-80" />
      {isAuthor && post.pendingJoinRequestsCount ? (
        <span className="absolute end-4 top-4 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-xs font-black text-white shadow-sm">
          {post.pendingJoinRequestsCount}
        </span>
      ) : null}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-soft capitalize">{categoryLabel(post.category)}</span>
            {post.level ? <span className="badge-soft bg-cyan-50 text-cyan-700 ring-cyan-100">{post.level}</span> : null}
            {post.languagePref ? <span className="badge-soft bg-slate-100 text-slate-700 ring-slate-200">{post.languagePref}</span> : null}
          </div>

          <Link to={`/posts/${post._id}`} className="block text-start text-xl font-black leading-snug tracking-tight text-slate-950 transition hover:text-emerald-700 sm:text-2xl">
            {title}
          </Link>

          {post.category === 'study_partner' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(post.subjectCodes ?? []).map((subjectCode) => {
                  const subject = getCatalogSubjectByCode(subjectCode);
                  return (
                    <SubjectBadge
                      key={subjectCode}
                      label={getSubjectFullName(subjectCode) || subjectCode}
                      compactLabel={subject?.shortName || getSubjectShortNameByCode(subjectCode) || 'M'}
                      isImportant={prioritySet.has(subjectCode)}
                      onClick={() => setSelectedSubjectName(getSubjectFullName(subjectCode) || subjectCode)}
                    />
                  );
                })}
                <span className="badge-soft bg-slate-100 text-slate-700 ring-slate-200">{t.post.role}: {roleLabel}</span>
                <span className="badge-soft bg-indigo-50 text-indigo-700 ring-indigo-100">{t.post.activity}: {activityLabel}</span>
              </div>
              {post.availabilityDate ? (
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <CalendarDays size={14} /> {t.post.until} {new Date(post.availabilityDate).toLocaleDateString()}
                </p>
              ) : null}
              {post.description ? <p className={descriptionClassName}>{post.description}</p> : null}
            </div>
          ) : (
            <div className="space-y-3">
              {post.category === 'project_team' ? (
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="badge-soft bg-slate-100 text-slate-700 ring-slate-200">
                    {t.post.approved}: {post.acceptedUserIds?.length ?? 0} / {post.participantTargetCount ?? 0}
                  </span>
                  {post.teamRoles?.map((role) => (
                    <span key={role} className="badge-soft bg-indigo-50 text-indigo-700 ring-indigo-100">{roleLabels[role]?.[language] ?? role}</span>
                  ))}
                </div>
              ) : null}
              <p className="text-sm font-medium text-slate-500">
                {[post.faculty ?? t.post.facultyMissing, post.languagePref ?? t.post.openLanguage].filter(Boolean).join(' · ')}
              </p>
              {post.availabilityDate ? (
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <CalendarDays size={14} /> {t.post.until} {new Date(post.availabilityDate).toLocaleDateString()}
                </p>
              ) : null}
              {post.description ? <p className={descriptionClassName}>{post.description}</p> : null}
              <div className="flex flex-wrap gap-2">
                {normalizedRole ? <span className="badge-soft bg-slate-100 text-slate-700 ring-slate-200">{t.post.role}: {roleLabel}</span> : null}
                {normalizedActivity ? <span className="badge-soft bg-indigo-50 text-indigo-700 ring-indigo-100">{t.post.activity}: {activityLabel}</span> : null}
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3 lg:w-64 lg:items-end">
          <Link to={`/profile/${resolveAuthorId(post)}`} className="flex items-center gap-3 rounded-3xl bg-slate-50/80 p-2 pe-3 transition hover:bg-emerald-50">
            <Avatar className="h-11 w-11 shrink-0 border border-white shadow-sm">
              <AvatarImage src={post.author?.avatarUrl} alt={post.author?.username ?? 'Auteur'} />
              <AvatarFallback className="bg-emerald-50 text-sm font-black text-emerald-700">
                {(post.author?.username ?? 'A')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-start">
              <p className="truncate font-bold text-slate-900">{post.author?.username ?? 'Auteur'}</p>
              <p className="text-xs font-medium text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</p>
            </div>
          </Link>
          <TrustSnapshot
            language={language}
            rating={post.author?.averageRating}
            sessionsCount={post.author?.sessionsCount}
            reviewsCount={post.author?.totalReviews}
          />

          {typeof post.compatibilityPercentage === 'number' ? (
            <div className="text-end">
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-black shadow-sm ring-4 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-emerald-200 ${getCompatibilityBadgeClass(post.compatibilityPercentage)}`}
                onClick={() => setIsCompatibilityOpen(true)}
                aria-label={`${post.compatibilityPercentage}% ${t.post.match}`}
              >
                {post.compatibilityPercentage}% {t.post.match}
              </button>
            </div>
          ) : typeof post.matchPercent === 'number' ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-black text-white shadow-sm ring-4 ring-emerald-100 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-emerald-200"
              onClick={() => setIsCompatibilityOpen(true)}
              aria-label={`${post.matchPercent}% ${t.post.match}`}
            >
              {post.matchPercent}% {t.post.match}
            </button>
          ) : null}
        </aside>
      </div>

      {showTags && (post.tags ?? []).length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-sm">
          {(post.tags ?? []).map((tag) => <span key={tag} className="badge-soft bg-slate-100 text-slate-700 ring-slate-200">#{tag}</span>)}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/posts/${post._id}`} className="primary-btn">
          <Users size={16} /> {t.post.view} <ArrowUpRight size={15} />
        </Link>
      </div>

      <Dialog open={Boolean(selectedSubjectName)} onOpenChange={(open) => !open && setSelectedSubjectName('')}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'اسم المادة الكامل' : 'Nom complet de la matière'}</DialogTitle>
          </DialogHeader>
          <p className="text-slate-700">{selectedSubjectName}</p>
        </DialogContent>
      </Dialog>

      <CompatibilityDetailsDialog
        open={isCompatibilityOpen}
        onOpenChange={setIsCompatibilityOpen}
        post={post}
        profile={profile}
      />
    </article>
  );
};

export default PostCard;
