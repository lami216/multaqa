import { getTermSemesterForLevel } from './catalog';
import type { AcademicSettingsResponse } from './http';

export const resolveCurrentAcademicTerm = (
  settings?: AcademicSettingsResponse | null
): 'odd' | 'even' => {
  const value =
    settings?.settings?.currentTermType
    ?? settings?.currentTermType
    ?? settings?.academicTermType;

  return value === 'even' ? 'even' : 'odd';
};

export const getActiveSemesterForLevel = (
  level?: string,
  settings?: AcademicSettingsResponse | null
): string | undefined => getTermSemesterForLevel(level, resolveCurrentAcademicTerm(settings));
