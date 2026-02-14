import React from 'react';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PostResponse } from '../lib/http';
import { resolveAuthorId } from '../lib/postUtils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const roleLabels: Record<string, string> = {
  need_help: 'محتاج مساعدة',
  can_help: 'اقدر اساعد',
  general_review: 'مراجعة عامة',
  td: 'حل TD',
  archive: 'حل الأرشيف',
};

const categoryLabel = (category: string) => (category === 'project_team' ? 'study_team' : category);

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
  const isAuthor = currentUserId ? resolveAuthorId(post) === currentUserId : false;
  const roleLabel = post.postRole ? roleLabels[post.postRole] ?? post.postRole : 'Non précisé';
  const descriptionClassName = `text-sm text-slate-700 leading-relaxed${clampDescription ? ' line-clamp-3' : ''}`;

  return (
    <div className="card-surface p-4 sm:p-5 flex flex-col gap-3 relative">
      {isAuthor && post.pendingJoinRequestsCount ? (
        <span className="absolute right-3 top-3 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[0.65rem] font-bold text-white">
          {post.pendingJoinRequestsCount}
        </span>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2 items-center text-xs font-semibold text-emerald-700">
            <span className="badge-soft">{categoryLabel(post.category)}</span>
            {post.level ? <span className="badge-soft bg-blue-50 text-blue-700">{post.level}</span> : null}
            {post.languagePref ? <span className="badge-soft bg-emerald-50 text-emerald-700">{post.languagePref}</span> : null}
          </div>
          <Link to={`/posts/${post._id}`} className="text-xl font-semibold text-slate-900 hover:text-emerald-700">
            {post.title}
          </Link>
          {post.category === 'study_partner' ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {(post.subjectCodes ?? []).map((subject) => (
                  <span key={subject} className="badge-soft bg-emerald-50 text-emerald-700">{subject}</span>
                ))}
                <span className="badge-soft bg-slate-100 text-slate-700">Rôle {roleLabel}</span>
              </div>
              {post.availabilityDate ? (
                <p className="text-xs text-slate-500">Available until {new Date(post.availabilityDate).toLocaleDateString()}</p>
              ) : null}
              {post.description ? (
                <p className={descriptionClassName}>{post.description}</p>
              ) : null}
            </div>
          ) : (
            <>
              {post.category === 'project_team' ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Approved: {post.acceptedUserIds?.length ?? 0} / {post.participantTargetCount ?? 0}</p>
                  {(post.teamRoles?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {post.teamRoles?.map((role) => (
                        <span key={role} className="badge-soft bg-slate-100 text-slate-700">Rôle {roleLabels[role] ?? role}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <p className="text-sm text-slate-600">
                {[post.faculty ?? 'Faculté non renseignée', post.languagePref ?? 'Langue libre'].filter(Boolean).join(' · ')}
              </p>
              {post.availabilityDate ? (
                <p className="text-xs text-slate-500">Available until {new Date(post.availabilityDate).toLocaleDateString()}</p>
              ) : null}
              {post.description ? (
                <p className={descriptionClassName}>{post.description}</p>
              ) : null}
              {post.postRole ? (
                <p className="text-sm font-semibold text-slate-700">Rôle {roleLabel}</p>
              ) : null}
            </>
          )}
        </div>
        <div className="flex items-start gap-3 text-sm text-slate-500 sm:min-w-[200px] sm:justify-end">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={post.author?.avatarUrl} alt={post.author?.username ?? 'Auteur'} />
            <AvatarFallback className="bg-emerald-50 text-emerald-700 text-sm font-semibold">
              {(post.author?.username ?? 'A')[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div>
              <p className="font-semibold text-slate-800">{post.author?.username ?? 'Auteur'}</p>
              <p>{new Date(post.createdAt).toLocaleDateString()}</p>
            </div>
            {typeof post.matchPercent === 'number' ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-base font-semibold text-white shadow-sm">
                Match <span className="text-lg font-bold">{post.matchPercent}%</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {showTags ? (
        <div className="flex flex-wrap gap-2 text-sm">
          {(post.tags ?? []).map((tag) => (
            <span key={tag} className="badge-soft">{tag}</span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link to={`/posts/${post._id}`} className="primary-btn">
          <Users size={16} className="me-1" /> Consulter
        </Link>
      </div>
    </div>
  );
};

export default PostCard;
