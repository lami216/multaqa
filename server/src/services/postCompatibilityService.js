const normalizeValue = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const uniqueCodes = (codes = []) => (
  [...new Set(
    codes
      .map((code) => (typeof code === 'string' ? code.trim() : ''))
      .filter(Boolean)
  )]
);

const extractRemainingSubjectCodes = (remainingSubjects = []) =>
  remainingSubjects
    .map((item) => (typeof item === 'string' ? item : item?.subjectCode))
    .map((code) => (typeof code === 'string' ? code.trim() : ''))
    .filter(Boolean);

const getProfileSubjectCodes = (profile) => uniqueCodes([
  ...(profile?.subjectCodes ?? []),
  ...(profile?.subjects ?? []),
  ...extractRemainingSubjectCodes(profile?.remainingSubjects ?? [])
]);

const getPrioritySubjectCodes = (profile) => uniqueCodes(
  (profile?.subjectsSettings ?? [])
    .filter((item) => item?.isPriority && typeof item?.subjectCode === 'string')
    .map((item) => item.subjectCode)
);

const getReceiverRolePreference = (profile) => {
  const priorities = Array.isArray(profile?.prioritiesOrder) ? profile.prioritiesOrder : [];
  const roleOrder = priorities.filter((item) => item === 'need_help' || item === 'can_help');
  return roleOrder[0] ?? null;
};

const getReceiverActivityPreference = (profile) => {
  const priorities = Array.isArray(profile?.prioritiesOrder) ? profile.prioritiesOrder : [];
  const activityOrder = priorities.filter((item) => item === 'td' || item === 'archive');
  return activityOrder[0] ?? null;
};

const getPostSubjectCode = (post) => {
  if (!Array.isArray(post?.subjectCodes)) return null;
  const first = post.subjectCodes.find((code) => typeof code === 'string' && code.trim());
  return first ? first.trim() : null;
};

const getPostRole = (post) => (
  post?.postRole === 'need_help' || post?.postRole === 'can_help' ? post.postRole : null
);

const getPostActivity = (post) => (
  post?.postRole === 'td' || post?.postRole === 'archive'
    ? post.postRole
    : Array.isArray(post?.teamRoles)
      ? (post.teamRoles.find((role) => role === 'td' || role === 'archive') ?? null)
      : null
);

export const computePostCompatibilityForUser = (post, receiverProfile) => {
  const postSubjectCode = getPostSubjectCode(post);
  const receiverSubjectCodes = getProfileSubjectCodes(receiverProfile);
  const receiverPrioritySubjectCodes = getPrioritySubjectCodes(receiverProfile);

  let subjectScore = 0;
  if (postSubjectCode) {
    const normalizedPostSubject = normalizeValue(postSubjectCode);
    const receiverPrioritySet = new Set(receiverPrioritySubjectCodes.map((code) => normalizeValue(code)));
    const receiverSubjectSet = new Set(receiverSubjectCodes.map((code) => normalizeValue(code)));
    if (receiverPrioritySet.has(normalizedPostSubject)) {
      subjectScore = 50;
    } else if (receiverSubjectSet.has(normalizedPostSubject)) {
      subjectScore = 30;
    }
  }

  const receiverRolePreference = getReceiverRolePreference(receiverProfile);
  const postRole = getPostRole(post);
  let roleScore = 0;
  if (receiverRolePreference && postRole) {
    if (
      (receiverRolePreference === 'need_help' && postRole === 'can_help') ||
      (receiverRolePreference === 'can_help' && postRole === 'need_help')
    ) {
      roleScore = 30;
    } else if (receiverRolePreference === 'can_help' && postRole === 'can_help') {
      roleScore = 20;
    } else if (receiverRolePreference === 'need_help' && postRole === 'need_help') {
      roleScore = 10;
    }
  }

  const receiverActivityPreference = getReceiverActivityPreference(receiverProfile);
  const postActivity = getPostActivity(post);
  let activityScore = 0;
  if (receiverActivityPreference && postActivity) {
    activityScore = receiverActivityPreference === postActivity ? 20 : 10;
  } else if (receiverActivityPreference || postActivity) {
    console.info(
      `[compatibility] activity_missing_side receiverActivity=${receiverActivityPreference ?? 'missing'} postActivity=${postActivity ?? 'missing'} postId=${post?._id ?? 'unknown'}`
    );
  }

  const compatibilityPercentage = subjectScore + roleScore + activityScore;
  return {
    compatibilityPercentage,
    compatibilityBreakdown: {
      subjectScore,
      roleScore,
      activityScore
    }
  };
};
