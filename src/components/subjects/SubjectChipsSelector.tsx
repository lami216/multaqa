import React from 'react';
import { getSubjectShortNameByCode } from '../../lib/catalog';
import SelectedSubjectPill from './SelectedSubjectPill';
import SubjectBadge from './SubjectBadge';

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
  selectedLabel?: string;
  onToggle: (subjectCode: string) => void;
  importantSubjectCodes?: string[];
 
}

const SubjectChipsSelector: React.FC<SubjectChipsSelectorProps> = ({
  options,
  selectedCodes,
  selectedSubjects,
  warning,
  highlight,
  emptyMessage,
  selectedLabel = 'Selected subjects:',
  onToggle,
  importantSubjectCodes = [],
}) => {
  const importantSet = new Set(importantSubjectCodes);
  return (
    <div className="space-y-2">
      {warning ? (
        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1">{warning}</p>
      ) : null}
      <div
        className={`flex flex-wrap gap-2 rounded-2xl border p-2 transition ${highlight ? 'border-red-300 bg-red-50/70' : 'border-transparent'}`}
      >
        {options.length === 0 && emptyMessage ? (
          <span className="text-xs text-rose-600">{emptyMessage}</span>
        ) : (
          options.map((subject) => {
            const selected = selectedCodes.includes(subject);
            return (
              <SubjectBadge
                key={subject}
                label={subject}
                compactLabel={getSubjectShortNameByCode(subject) || 'M'}
                isImportant={importantSet.has(subject)}
               
                onClick={() => onToggle(subject)}
                className={selected ? 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100' : ''}
              />
            );
          })
        )}
      </div>

      {selectedSubjects.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">{selectedLabel}</p>
          <div className="flex flex-wrap gap-2">
            {selectedSubjects.map((subject) => (
              <SelectedSubjectPill
                key={subject.code}
                label={subject.fullName}
                isImportant={importantSet.has(subject.code)}
               
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
