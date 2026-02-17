import type { Profile } from './http';

export const getProfileSelectableSubjectCodes = (profile?: Profile | null): string[] => {
  const remainingCodes = (profile?.remainingSubjects ?? [])
    .map((item) => (typeof item === 'string' ? item : item?.subjectCode))
    .filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
    .map((code) => code.trim());

  return Array.from(new Set([
    ...(profile?.subjectCodes ?? []),
    ...(profile?.subjects ?? []),
    ...remainingCodes
  ].map((code) => (typeof code === 'string' ? code.trim() : '')).filter(Boolean)));
};
