import React from 'react';
import { BookOpen, CalendarDays, CheckCircle2, GraduationCap, Handshake, Info, Sparkles, Tags } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { PostResponse, Profile } from '../lib/http';
import { getSubjectFullName, getSubjectShortNameByCode } from '../lib/catalog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

const MAX_COMPATIBILITY_SCORE = 100;

const roleLabels: Record<string, { fr: string; ar: string }> = {
  need_help: { fr: 'Besoin d’aide', ar: 'أحتاج مساعدة' },
  can_help: { fr: 'Peut aider', ar: 'أستطيع المساعدة' },
};

const activityLabels: Record<string, { fr: string; ar: string }> = {
  td: { fr: 'TD', ar: 'حل TD' },
  archive: { fr: 'Archives', ar: 'حل الأرشيف' },
  general_review: { fr: 'Révision', ar: 'مراجعة عامة' },
};

interface CompatibilityDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: PostResponse;
  profile?: Profile | null;
}

interface ReasonItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  score: number;
  max: number;
}

const normalizeValue = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const uniqueCodes = (codes: string[] = []) => (
  [...new Set(codes.map((code) => code.trim()).filter(Boolean))]
);

const getProfileSubjectCodes = (profile?: Profile | null) => uniqueCodes([
  ...(profile?.subjectCodes ?? []),
  ...(profile?.subjects ?? []),
  ...((profile?.remainingSubjects ?? []).map((item) => (typeof item === 'string' ? item : item.subjectCode)))
]);

const getSubjectLabel = (subjectCode: string) => (
  getSubjectFullName(subjectCode) || getSubjectShortNameByCode(subjectCode) || subjectCode
);

const getRolePreference = (profile?: Profile | null) => (
  profile?.rolePreferences?.find((item) => item === 'need_help' || item === 'can_help')
  ?? profile?.prioritiesOrder?.find((item) => item === 'need_help' || item === 'can_help')
);

const getActivityPreference = (profile?: Profile | null) => (
  profile?.activityPreferences?.find((item) => item === 'td' || item === 'archive')
  ?? profile?.prioritiesOrder?.find((item) => item === 'td' || item === 'archive')
);

const getPostActivity = (post: PostResponse) => {
  const legacyPostRole = (post as { postRole?: string }).postRole;
  return post.postActivity ?? (legacyPostRole === 'td' || legacyPostRole === 'archive' ? legacyPostRole : undefined);
};

const getScoreTone = (score: number) => {
  if (score >= 80) return 'from-emerald-500 to-emerald-600 text-emerald-700 bg-emerald-50 ring-emerald-100';
  if (score >= 60) return 'from-amber-400 to-amber-500 text-amber-700 bg-amber-50 ring-amber-100';
  return 'from-orange-400 to-orange-500 text-orange-700 bg-orange-50 ring-orange-100';
};

const getReadableDate = (date?: string) => {
  if (!date) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date));
};

const CompatibilityDetailsDialog: React.FC<CompatibilityDetailsDialogProps> = ({
  open,
  onOpenChange,
  post,
  profile
}) => {
  const { language, t, isRtl } = useLanguage();
  const score = post.compatibilityPercentage ?? post.matchPercent ?? 0;
  const breakdown = post.compatibilityBreakdown;
  const postSubjectCodes = uniqueCodes(post.subjectCodes ?? []);
  const profileSubjectCodes = getProfileSubjectCodes(profile);
  const profileSubjectSet = new Set(profileSubjectCodes.map(normalizeValue));
  const derivedMatchedSubjectCodes = postSubjectCodes.filter((subjectCode) => profileSubjectSet.has(normalizeValue(subjectCode)));
  const matchedSubjectCodes = breakdown?.subjectMatchedCodes ?? derivedMatchedSubjectCodes;
  const missingSubjectCodes = breakdown?.subjectMissingCodes
    ?? postSubjectCodes.filter((subjectCode) => !profileSubjectSet.has(normalizeValue(subjectCode)));
  const subjectTotalCount = breakdown?.subjectTotalCount ?? postSubjectCodes.length;
  const subjectMatchedCount = breakdown?.subjectMatchedCount ?? matchedSubjectCodes.length;
  const subjectCategoryPercent = subjectTotalCount > 0 ? Math.round((subjectMatchedCount / subjectTotalCount) * 100) : 0;
  const rolePreference = getRolePreference(profile);
  const activityPreference = getActivityPreference(profile);
  const postRole = post.postRole === 'need_help' || post.postRole === 'can_help' ? post.postRole : undefined;
  const postActivity = getPostActivity(post);

  const text = {
    title: language === 'ar' ? 'لماذا هذا التوافق؟' : 'Pourquoi cette compatibilité ?',
    subtitle: language === 'ar'
      ? 'نشرح العوامل الحقيقية المستعملة لترتيب هذا المنشور دون عرض معادلات داخلية.'
      : 'Les facteurs réels utilisés pour classer ce post, présentés sans formule interne brute.',
    strongest: language === 'ar' ? 'أقوى أسباب التوافق' : 'Raisons les plus fortes',
    context: language === 'ar' ? 'سياق إضافي' : 'Contexte utile',
    subjectTitle: language === 'ar' ? 'المادة أو الوحدة' : 'Matière ou module',
    roleTitle: language === 'ar' ? 'تبادل المساعدة' : 'Complémentarité d’aide',
    activityTitle: language === 'ar' ? 'نوع النشاط' : 'Type d’activité',
    noBreakdown: language === 'ar'
      ? 'لا توجد تفاصيل كافية لهذا النوع من التوافق حالياً.'
      : 'Les détails de ce score ne sont pas disponibles pour ce type de compatibilité.',
    subjectMatch: language === 'ar'
      ? `تطابق المواد: ${subjectMatchedCount}/${subjectTotalCount}. درجة المادة: ${subjectCategoryPercent}% من فئة المادة.`
      : `Correspondance matières : ${subjectMatchedCount}/${subjectTotalCount}. Score matière : ${subjectCategoryPercent}% de la catégorie matière.`,
    subjectPartial: language === 'ar'
      ? `تطابق جزئي في المواد: ${subjectMatchedCount}/${subjectTotalCount}. درجة المادة: ${subjectCategoryPercent}% من فئة المادة.`
      : `Correspondance partielle des matières : ${subjectMatchedCount}/${subjectTotalCount}. Score matière : ${subjectCategoryPercent}% de la catégorie matière.`,
    subjectMissing: language === 'ar'
      ? `تطابق المواد: ${subjectMatchedCount}/${subjectTotalCount}. درجة المادة: 0% من فئة المادة.`
      : `Correspondance matières : ${subjectMatchedCount}/${subjectTotalCount}. Score matière : 0% de la catégorie matière.`,
    matchedSubjects: language === 'ar' ? 'مواد متطابقة' : 'Matières trouvées',
    missingSubjects: language === 'ar' ? 'مواد غير موجودة في ملفك' : 'Matières absentes de votre profil',
    roleComplement: language === 'ar'
      ? 'أحد الطرفين يستطيع المساعدة بينما الطرف الآخر يحتاجها.'
      : 'Une personne peut aider pendant que l’autre cherche de l’aide.',
    roleAligned: language === 'ar'
      ? 'اتجاه الدور قريب من تفضيلاتك الحالية.'
      : 'Le rôle reste proche de vos préférences actuelles.',
    roleWeak: language === 'ar'
      ? 'الدور أقل تطابقاً مع أولوياتك الحالية.'
      : 'Le rôle correspond moins à vos priorités actuelles.',
    activityStrong: language === 'ar'
      ? 'نوع النشاط المطلوب يطابق أولويتك.'
      : 'Le type d’activité correspond à votre priorité.',
    activityRelated: language === 'ar'
      ? 'نوع النشاط قريب من تفضيلاتك لكنه ليس مطابقاً تماماً.'
      : 'Le type d’activité est proche de vos préférences sans être identique.',
    activityWeak: language === 'ar'
      ? 'لم نجد تطابقاً واضحاً في نوع النشاط.'
      : 'Aucune correspondance claire sur le type d’activité.',
    faculty: language === 'ar' ? 'نفس الكلية' : 'Même faculté',
    level: language === 'ar' ? 'نفس المستوى' : 'Même niveau',
    availability: language === 'ar' ? 'تاريخ التوفر' : 'Disponibilité',
    tags: language === 'ar' ? 'وسوم المنشور' : 'Tags du post',
    viewed: language === 'ar' ? 'تم حسابه من بيانات ملفك والمنشور' : 'Calculé à partir de votre profil et du post',
    scoreLabel: language === 'ar' ? 'درجة التوافق' : 'Score de compatibilité'
  };

  const reasons: ReasonItem[] = breakdown ? [
    {
      id: 'subject',
      icon: <BookOpen size={18} />,
      title: text.subjectTitle,
      description: breakdown.subjectScore >= 50
        ? text.subjectMatch
        : breakdown.subjectScore > 0 ? text.subjectPartial : text.subjectMissing,
      score: breakdown.subjectScore,
      max: 50
    },
    {
      id: 'role',
      icon: <Handshake size={18} />,
      title: text.roleTitle,
      description: breakdown.roleScore >= 30
        ? text.roleComplement
        : breakdown.roleScore > 0 ? text.roleAligned : text.roleWeak,
      score: breakdown.roleScore,
      max: 30
    },
    {
      id: 'activity',
      icon: <Sparkles size={18} />,
      title: text.activityTitle,
      description: breakdown.activityScore >= 20
        ? text.activityStrong
        : breakdown.activityScore > 0 ? text.activityRelated : text.activityWeak,
      score: breakdown.activityScore,
      max: 20
    }
  ] : [];

  const contextItems = [
    profile?.faculty && post.faculty && normalizeValue(profile.faculty) === normalizeValue(post.faculty)
      ? { icon: <GraduationCap size={14} />, label: text.faculty, value: post.faculty }
      : null,
    profile?.level && post.level && normalizeValue(profile.level) === normalizeValue(post.level)
      ? { icon: <GraduationCap size={14} />, label: text.level, value: post.level }
      : null,
    post.availabilityDate
      ? { icon: <CalendarDays size={14} />, label: text.availability, value: getReadableDate(post.availabilityDate) }
      : null,
    post.tags?.length
      ? { icon: <Tags size={14} />, label: text.tags, value: post.tags.slice(0, 4).map((tag) => `#${tag}`).join(' ') }
      : null,
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-t-[2rem] border-white/70 bg-white/95 p-0 shadow-hover backdrop-blur sm:max-w-lg sm:rounded-[2rem]" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="p-5 sm:p-6">
          <DialogHeader className="text-start">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Sparkles size={20} />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-950">{text.title}</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-500">{text.subtitle}</DialogDescription>
          </DialogHeader>

          <div className="mt-5 rounded-[1.5rem] bg-slate-950 p-4 text-white">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-300">{text.scoreLabel}</p>
                <p className="mt-1 text-4xl font-black leading-none">{score}%</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-100 ring-1 ring-white/10">
                {t.post.match}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${getScoreTone(score).split(' ').slice(0, 2).join(' ')}`}
                style={{ inlineSize: `${Math.min(score, MAX_COMPATIBILITY_SCORE)}%` }}
              />
            </div>
            <p className="mt-3 text-xs font-medium text-slate-300">{text.viewed}</p>
          </div>

          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-black text-slate-900">{text.strongest}</h3>
            {reasons.length ? reasons.map((reason) => {
              const percent = reason.max > 0 ? Math.round((reason.score / reason.max) * 100) : 0;
              return (
                <article key={reason.id} className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 ring-1 ring-slate-100">
                      {reason.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-black text-slate-950">{reason.title}</h4>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{reason.description}</p>
                        </div>
                        {reason.score > 0 ? (
                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                            +{reason.score}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white" aria-label={`${reason.title} ${percent}%`}>
                        <div className="h-full rounded-full bg-emerald-500" style={{ inlineSize: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-[1.25rem] bg-slate-50 p-4 text-sm font-medium text-slate-600">
                <Info className="me-2 inline text-slate-400" size={16} />
                {text.noBreakdown}
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-black text-slate-900">{text.context}</h3>
            <div className="flex flex-wrap gap-2">
              {matchedSubjectCodes.map((subjectCode) => (
                <span key={`matched-${subjectCode}`} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                  <CheckCircle2 size={14} /> {text.matchedSubjects}: {getSubjectLabel(subjectCode)}
                </span>
              ))}
              {missingSubjectCodes.map((subjectCode) => (
                <span key={`missing-${subjectCode}`} className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 ring-1 ring-orange-100">
                  <BookOpen size={14} /> {text.missingSubjects}: {getSubjectLabel(subjectCode)}
                </span>
              ))}
              {rolePreference && postRole ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  <Handshake size={14} /> {roleLabels[rolePreference]?.[language]} ↔ {roleLabels[postRole]?.[language]}
                </span>
              ) : null}
              {activityPreference && postActivity ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">
                  <Sparkles size={14} /> {activityLabels[activityPreference]?.[language]} / {activityLabels[postActivity]?.[language]}
                </span>
              ) : null}
              {contextItems.map((item) => item ? (
                <span key={`${item.label}-${item.value}`} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  {item.icon} {item.label}: <bdi>{item.value}</bdi>
                </span>
              ) : null)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompatibilityDetailsDialog;
