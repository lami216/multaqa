const CONNECTOR_WORDS = new Set(['de', 'des', 'du', 'la', 'le', 'et']);
const ROMAN_NUMERAL_PATTERN = /^(?=[ivxlcdm]+$)m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i;

const normalizeToken = (token: string): string => token.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const tokenize = (value: string): string[] =>
  value
    .split(/\s+/)
    .map((part) => part.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);

const getTokenInitial = (token: string): string => {
  if (ROMAN_NUMERAL_PATTERN.test(token)) {
    return token.toUpperCase();
  }

  const [first] = Array.from(token);
  return first ? first.toLocaleUpperCase('fr-FR') : '';
};

export const buildSubjectInitials = (subjectName?: string | null, fallbackCode?: string | null): string => {
  const source = subjectName?.trim();
  if (!source) return fallbackCode?.trim() ?? '';

  const initials = tokenize(source)
    .filter((token) => !CONNECTOR_WORDS.has(normalizeToken(token)))
    .map(getTokenInitial)
    .join('');

  return initials || fallbackCode?.trim() || source;
};

export const buildSubjectShortName = (subjectName?: string | null): string => {
  const source = subjectName?.trim();
  if (!source) return '';

  const initials = tokenize(source)
    .filter((token) => !CONNECTOR_WORDS.has(normalizeToken(token)))
    .map(getTokenInitial)
    .join('');

  return initials || source.slice(0, 1).toLocaleUpperCase('fr-FR');
};
