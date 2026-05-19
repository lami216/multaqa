export const ROLE_PREFERENCE_OPTIONS = [
  { key: 'need_help', label: 'أحتاج مساعدة', helper: 'أبحث عن من يساعدني في المادة.' },
  { key: 'can_help', label: 'أستطيع المساعدة', helper: 'أستطيع شرح المادة ومساعدة الآخرين.' }
] as const;

export const ACTIVITY_PREFERENCE_OPTIONS = [
  { key: 'td', label: 'حل TD', helper: 'أركز على حل وتمرينات TD.' },
  { key: 'archive', label: 'حل الأرشيف', helper: 'أركز على الأسئلة والأرشيف.' }
] as const;

export type RolePreferenceKey = (typeof ROLE_PREFERENCE_OPTIONS)[number]['key'];
export type ActivityPreferenceKey = (typeof ACTIVITY_PREFERENCE_OPTIONS)[number]['key'];
export type LegacyPriorityKey = RolePreferenceKey | ActivityPreferenceKey;

export const DEFAULT_ROLE_PREFERENCES_ORDER: RolePreferenceKey[] = ['need_help', 'can_help'];
export const DEFAULT_ACTIVITY_PREFERENCES_ORDER: ActivityPreferenceKey[] = ['td', 'archive'];
export const DEFAULT_PRIORITIES_ORDER: LegacyPriorityKey[] = [
  ...DEFAULT_ROLE_PREFERENCES_ORDER,
  ...DEFAULT_ACTIVITY_PREFERENCES_ORDER
];

const normalizeOrdered = <T extends string>(values: unknown, defaults: readonly T[]): T[] => {
  const incoming = Array.isArray(values)
    ? values.filter((item): item is T => typeof item === 'string' && (defaults as readonly string[]).includes(item))
    : [];
  const rest = defaults.filter((item) => !incoming.includes(item));
  return [...incoming, ...rest];
};

export const normalizeRolePreferences = (values?: unknown): RolePreferenceKey[] =>
  normalizeOrdered(values, DEFAULT_ROLE_PREFERENCES_ORDER);

export const normalizeActivityPreferences = (values?: unknown): ActivityPreferenceKey[] =>
  normalizeOrdered(values, DEFAULT_ACTIVITY_PREFERENCES_ORDER);

export const parseLegacyPriorities = (values?: unknown) => {
  const legacy = Array.isArray(values) ? values : [];
  return {
    rolePreferences: normalizeRolePreferences(legacy.filter((item) => item === 'need_help' || item === 'can_help')),
    activityPreferences: normalizeActivityPreferences(legacy.filter((item) => item === 'td' || item === 'archive'))
  };
};
