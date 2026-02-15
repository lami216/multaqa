import React from 'react';
import { getSubjectShortNameByCode } from '../../lib/catalog';
import SelectedSubjectPill from './SelectedSubjectPill';

interface SubjectOption {
  code: string;
  fullName: string;
}

interface SubjectChipsSelectorProps {
  options: string[];
  selectedCodes: string[];
  selectedSubjects: SubjectOption[];
  warning?: string;
  highlight?: boolean;
  emptyMessage?: string;
  onToggle: (subjectCode: string) => void;
}

const SubjectChipsSelector: React.FC<SubjectChipsSelectorProps> = ({
  options,
  selectedCodes,
  selectedSubjects,
  warning,
  highlight,
  emptyMessage,
  onToggle
}) => {
  return (
    <div className="space-y-2">
      {warning ? (
        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1">{warning}</p>
      ) : null}
      <div
        className={`flex flex-wrap gap-2 rounded-lg border p-2 transition ${highlight ? 'border-red-300 bg-red-50/70' : 'border-transparent'}`}
      >
        {options.length === 0 && emptyMessage ? (
          <span className="text-xs text-rose-600">{emptyMessage}</span>
        ) : (
          options.map((subject) => {
            const selected = selectedCodes.includes(subject);
            return (
              <button
                type="button"
                key={subject}
                onClick={() => onToggle(subject)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  selected ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {getSubjectShortNameByCode(subject) || 'M'}
              </button>
            );
          })
        )}
      </div>

      {selectedSubjects.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Selected subjects:</p>
          <div className="flex flex-wrap gap-2">
            {selectedSubjects.map((subject) => (
              <SelectedSubjectPill
                key={subject.code}
                label={subject.fullName}
                onRemove={() => onToggle(subject.code)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SubjectChipsSelector;
