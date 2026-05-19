import React from 'react';

import SubjectBadge from './SubjectBadge';

interface SelectedSubjectPillProps {
  label: string;
  onRemove?: () => void;
  isImportant?: boolean;
  importantLabel?: string;
}

const SelectedSubjectPill: React.FC<SelectedSubjectPillProps> = ({ label, onRemove, isImportant, importantLabel }) => {
  return (
    <SubjectBadge label={label} isImportant={isImportant} importantLabel={importantLabel} onRemove={onRemove} className="shadow-sm" />
  );
};

export default SelectedSubjectPill;
