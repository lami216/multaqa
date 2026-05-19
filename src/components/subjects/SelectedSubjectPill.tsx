import React from 'react';

import SubjectBadge from './SubjectBadge';

interface SelectedSubjectPillProps {
  label: string;
  onRemove?: () => void;
  isImportant?: boolean;
 
}

const SelectedSubjectPill: React.FC<SelectedSubjectPillProps> = ({ label, onRemove, isImportant }) => {
  return (
    <SubjectBadge label={label} isImportant={isImportant} onRemove={onRemove} className="shadow-sm" />
  );
};

export default SelectedSubjectPill;
