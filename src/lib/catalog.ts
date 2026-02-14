import catalog from '../data/catalog.json';

export interface CatalogSubject {
  code: string;
  nameAr: string;
  nameFr: string;
}

export interface CatalogSemester {
  id: string;
  nameAr: string;
  nameFr: string;
  subjects: CatalogSubject[];
}

export interface CatalogMajor {
  id: string;
  nameAr: string;
  nameFr: string;
  semesters: CatalogSemester[];
}

export interface CatalogLevel {
  id: string;
  nameAr: string;
  nameFr: string;
  majors: CatalogMajor[];
}

export interface CatalogFaculty {
  id: string;
  nameAr: string;
  nameFr: string;
  levels: CatalogLevel[];
}

export interface CatalogData {
  faculties: CatalogFaculty[];
}

const LEVEL_SEMESTER_MAP: Record<string, string[]> = {
  L1: ['S1', 'S2'],
  L2: ['S3', 'S4'],
  L3: ['S5', 'S6'],
  M1: ['S7', 'S8'],
  M2: ['S9', 'S10']
};


const formatNameFromCode = (code: string): string =>
  code
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr-FR')
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase('fr-FR'));

const normalizeCatalogSubject = (subject: CatalogSubject): CatalogSubject => {
  const normalizedCode = subject.code?.trim() ?? '';
  const normalizedNameFr = subject.nameFr?.trim() ?? '';
  const normalizedNameAr = subject.nameAr?.trim() ?? '';
  const fallbackName = normalizedCode ? formatNameFromCode(normalizedCode) : '';
  const resolvedNameFr = !normalizedNameFr || normalizedNameFr.toLowerCase() === normalizedCode.toLowerCase() ? fallbackName : normalizedNameFr;
  const resolvedNameAr = !normalizedNameAr || normalizedNameAr.toLowerCase() === normalizedCode.toLowerCase() ? resolvedNameFr : normalizedNameAr;

  return {
    ...subject,
    code: normalizedCode,
    nameFr: resolvedNameFr,
    nameAr: resolvedNameAr
  };
};

const catalogData = catalog as CatalogData;

export const getFaculties = (): CatalogFaculty[] => catalogData.faculties;

export const getLevelsByFaculty = (facultyId?: string): CatalogLevel[] => {
  if (!facultyId) return [];
  return catalogData.faculties.find((faculty) => faculty.id === facultyId)?.levels ?? [];
};

export const getMajorsByFacultyAndLevel = (facultyId?: string, levelId?: string): CatalogMajor[] => {
  if (!facultyId || !levelId) return [];
  const levels = getLevelsByFaculty(facultyId);
  return levels.find((level) => level.id === levelId)?.majors ?? [];
};

export const getSemestersByMajorAndLevel = (
  facultyId?: string,
  levelId?: string,
  majorId?: string
): CatalogSemester[] => {
  if (!facultyId || !levelId || !majorId) return [];
  const allowedSemesters = new Set(LEVEL_SEMESTER_MAP[levelId] ?? []);
  const major = getMajorsByFacultyAndLevel(facultyId, levelId).find((item) => item.id === majorId);
  if (!major) return [];
  return major.semesters.filter((semester) => (allowedSemesters.size ? allowedSemesters.has(semester.id) : true));
};

export const getSubjectsByMajorAndSemester = (
  facultyId?: string,
  levelId?: string,
  majorId?: string,
  semesterId?: string
): CatalogSubject[] => {
  if (!facultyId || !levelId || !majorId || !semesterId) return [];
  const semesters = getSemestersByMajorAndLevel(facultyId, levelId, majorId);
  return (semesters.find((semester) => semester.id === semesterId)?.subjects ?? []).map(normalizeCatalogSubject);
};
