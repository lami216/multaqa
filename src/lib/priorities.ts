export const PRIORITY_ROLE_OPTIONS = [
  { key: 'need_help', label: 'محتاج مساعدة', helper: 'أبحث عن من يساعدني في المادة.' },
  { key: 'can_help', label: 'اقدر اساعد', helper: 'أستطيع شرح المادة ومساعدة الآخرين.' },
  { key: 'td', label: 'حل TD', helper: 'أركز على حل وتمرينات TD.' },
  { key: 'archive', label: 'حل الأرشيف', helper: 'أركز على الأسئلة والأرشيف.' },
] as const;

export type PriorityRoleKey = (typeof PRIORITY_ROLE_OPTIONS)[number]['key'];

export const DEFAULT_PRIORITIES_ORDER: PriorityRoleKey[] = ['need_help', 'can_help', 'td', 'archive'];

export const PRIORITY_ROLE_LABELS: Record<PriorityRoleKey, string> = PRIORITY_ROLE_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.key]: item.label }),
  {} as Record<PriorityRoleKey, string>
);
