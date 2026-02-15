import React from 'react';

interface SelectedSubjectPillProps {
  label: string;
  onRemove?: () => void;
}

const SelectedSubjectPill: React.FC<SelectedSubjectPillProps> = ({ label, onRemove }) => {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm text-emerald-800 shadow-sm">
      <span>{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100"
          aria-label={`Supprimer ${label}`}
        >
          ×
        </button>
      ) : null}
    </div>
  );
};

export default SelectedSubjectPill;
