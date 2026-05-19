import { Star } from 'lucide-react';
import React from 'react';

interface SubjectBadgeProps {
  label: string;
  compactLabel?: string;
  isImportant?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
  dir?: 'rtl' | 'ltr';
  importantLabel?: string;
}

const SubjectBadge: React.FC<SubjectBadgeProps> = ({
  label,
  compactLabel,
  isImportant = false,
  onClick,
  onRemove,
  className = '',
  dir,
  importantLabel,
}) => {
  const content = compactLabel ?? label;
  const baseClass = isImportant
    ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-900 ring-1 ring-amber-200 shadow-sm'
    : 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700';

  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      dir={dir}
      className={`${baseClass} ${onClick ? 'transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:border-emerald-200' : ''} ${className}`.trim()}
    >
      {isImportant ? <Star size={13} className="fill-amber-400 text-amber-500" aria-hidden="true" /> : null}
      <span>{content}</span>
      {isImportant && importantLabel ? <span className="text-[10px] font-black uppercase tracking-wide text-amber-700">{importantLabel}</span> : null}
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-current transition hover:bg-white/70"
          aria-label={`Supprimer ${label}`}
        >
          ×
        </button>
      ) : null}
    </Tag>
  );
};

export default SubjectBadge;
