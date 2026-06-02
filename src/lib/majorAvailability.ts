import type { AcademicMajorAvailability } from './http';

export const getEffectiveMajorStatus = (
  status: AcademicMajorAvailability['status'] = 'active',
  registeredCount = 0,
  threshold = 0
): AcademicMajorAvailability['status'] =>
  status === 'collecting' && threshold > 0 && registeredCount >= threshold ? 'active' : status;

export const getEffectiveMajorAvailability = (availability?: AcademicMajorAvailability): AcademicMajorAvailability => {
  const status = availability?.status ?? 'active';
  const registeredCount = availability?.registeredCount ?? 0;
  const threshold = availability?.threshold ?? 0;
  const effectiveStatus = getEffectiveMajorStatus(status, registeredCount, threshold);

  return {
    status: effectiveStatus,
    registeredCount,
    threshold: effectiveStatus === 'collecting' ? threshold : null
  };
};
