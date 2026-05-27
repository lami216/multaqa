import { getSubjectsByMajorAndSemester, getTermSemesterForLevel, type CatalogSubject } from './catalog';
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

export const getCurrentSemesterIdForLevel = (
  level?: string,
  settings?: AcademicSettingsResponse | null
): string | undefined => getTermSemesterForLevel(level, resolveCurrentAcademicTerm(settings));

export const getActiveSemesterForLevel = getCurrentSemesterIdForLevel;

export const getCurrentTermSubjects = ({
  facultyId,
  level,
  majorId,
  academicSettings
}: {
  facultyId?: string;
  level?: string;
  majorId?: string;
  academicSettings?: AcademicSettingsResponse | null;
}): CatalogSubject[] => {
  const currentTermType = resolveCurrentAcademicTerm(academicSettings);
  const semesterId = getTermSemesterForLevel(level, currentTermType);

  if (!facultyId || !level || !majorId || !semesterId) return [];

  return getSubjectsByMajorAndSemester(
    facultyId,
    level,
    majorId,
    semesterId,
    currentTermType,
    academicSettings?.catalogVisibility
  );
};
