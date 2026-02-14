import AcademicSetting from '../models/AcademicSetting.js';
import Profile from '../models/Profile.js';

export const buildAcademicMajorKey = (facultyId, levelId, majorId) => `${facultyId || ''}|${levelId || ''}|${majorId || ''}`;

const DEFAULT_SETTINGS = {
  key: 'academic',
  currentTermType: 'odd',
  faculties: []
};

export const getAcademicSettingsRecord = async () => {
  const settings = await AcademicSetting.findOneAndUpdate(
    { key: 'academic' },
    { $setOnInsert: DEFAULT_SETTINGS },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return settings;
};

export const computeAcademicCounts = async () => {
  const grouped = await Profile.aggregate([
    {
      $match: {
        facultyId: { $exists: true, $nin: [null, ''] },
        level: { $exists: true, $nin: [null, ''] },
        majorId: { $exists: true, $nin: [null, ''] }
      }
    },
    {
      $group: {
        _id: {
          facultyId: '$facultyId',
          levelId: '$level',
          majorId: '$majorId'
        },
        count: { $sum: 1 }
      }
    }
  ]);

  return grouped.reduce((acc, row) => {
    acc[buildAcademicMajorKey(row._id.facultyId, row._id.levelId, row._id.majorId)] = row.count;
    return acc;
  }, {});
};

export const getMajorAvailabilityMap = (settings, counts = {}) => {
  const availability = {};
  for (const faculty of settings?.faculties ?? []) {
    for (const level of faculty?.levels ?? []) {
      for (const major of level?.majors ?? []) {
        const key = buildAcademicMajorKey(faculty.facultyId, level.levelId, major.majorId);
        availability[key] = {
          status: major.status === 'closed' ? 'collecting' : (major.status ?? 'active'),
          threshold: (major.status === 'collecting' || major.status === 'closed') ? (major.threshold ?? 1) : null,
          registeredCount: counts[key] ?? 0
        };
      }
    }
  }
  return availability;
};

export const maybeActivateMajor = async (facultyId, levelId, majorId) => {
  if (!facultyId || !levelId || !majorId) return false;
  const settings = await getAcademicSettingsRecord();
  const faculty = settings.faculties.find((item) => item.facultyId === facultyId);
  const level = faculty?.levels?.find((item) => item.levelId === levelId);
  const major = level?.majors?.find((item) => item.majorId === majorId);

  if (!major) {
    return false;
  }

  if (major.status === 'closed') {
    major.status = 'collecting';
  }

  if (major.status !== 'collecting' || !major.threshold || major.threshold <= 0) {
    return false;
  }

  const count = await Profile.countDocuments({ facultyId, level: levelId, majorId });
  if (count >= major.threshold) {
    major.status = 'active';
    major.threshold = null;
    await settings.save();
    return true;
  }

  return false;
};

export const getAcademicSettingsPayload = async () => {
  const settings = await getAcademicSettingsRecord();
  const counts = await computeAcademicCounts();
  const majorAvailability = getMajorAvailabilityMap(settings, counts);

  const legacyMajors = Object.entries(majorAvailability).reduce((acc, [key, value]) => {
    const [, , majorId] = key.split('|');
    if (!majorId) return acc;
    if (!acc[majorId] || value.registeredCount >= (acc[majorId].registeredCount ?? -1)) {
      acc[majorId] = { enabled: true, threshold: value.threshold ?? 0, registeredCount: value.registeredCount };
    }
    return acc;
  }, {});

  return {
    settings: {
      currentTermType: settings.currentTermType ?? 'odd',
      faculties: settings.faculties ?? []
    },
    counts,
    majorAvailability,
    academicTermType: settings.currentTermType ?? 'odd',
    catalogVisibility: {
      faculties: {},
      majors: Object.fromEntries(Object.entries(legacyMajors).map(([majorId, value]) => [majorId, { enabled: value.enabled, threshold: value.threshold }]))
    },
    preregCounts: Object.fromEntries(Object.entries(legacyMajors).map(([majorId, value]) => [majorId, value.registeredCount]))
  };
};
