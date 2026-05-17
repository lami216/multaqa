import assert from 'node:assert/strict';
import { computePostCompatibilityForUser } from '../postCompatibilityService.js';

const profileWithSubjects = (subjectCodes) => ({
  subjectCodes,
  prioritiesOrder: []
});

const subjectScoreFor = (postSubjectCodes, profile) => (
  computePostCompatibilityForUser({ subjectCodes: postSubjectCodes }, profile).compatibilityBreakdown.subjectScore
);

assert.equal(subjectScoreFor(['BIO2'], profileWithSubjects(['BIO2'])), 50);
assert.equal(subjectScoreFor(['BIO2', 'PHY2'], profileWithSubjects(['BIO2', 'PHY2'])), 50);
assert.equal(subjectScoreFor(['BIO2', 'PHY2'], profileWithSubjects(['BIO2'])), 25);
assert.equal(subjectScoreFor(['BIO2', 'PHY2', 'CHEM2'], profileWithSubjects(['BIO2'])), 17);
assert.equal(subjectScoreFor(['BIO2', 'PHY2'], profileWithSubjects(['MATH2'])), 0);

const remainingSubjectCompatibility = computePostCompatibilityForUser(
  { subjectCodes: ['L1-BIO', 'L2-PHY'] },
  {
    level: 'L2',
    subjectCodes: ['L2-PHY'],
    remainingSubjects: [{ subjectCode: 'L1-BIO', level: 'L1', majorId: 'science' }],
    prioritiesOrder: []
  }
);

assert.equal(remainingSubjectCompatibility.compatibilityBreakdown.subjectScore, 50);
assert.deepEqual(remainingSubjectCompatibility.compatibilityBreakdown.subjectMatchedCodes, ['L1-BIO', 'L2-PHY']);
assert.deepEqual(remainingSubjectCompatibility.compatibilityBreakdown.subjectMissingCodes, []);

const partialCompatibility = computePostCompatibilityForUser(
  { subjectCodes: ['BIO2', 'PHY2'] },
  profileWithSubjects(['BIO2'])
);

assert.equal(partialCompatibility.compatibilityBreakdown.subjectMatchedCount, 1);
assert.equal(partialCompatibility.compatibilityBreakdown.subjectTotalCount, 2);
assert.deepEqual(partialCompatibility.compatibilityBreakdown.subjectMatchedCodes, ['BIO2']);
assert.deepEqual(partialCompatibility.compatibilityBreakdown.subjectMissingCodes, ['PHY2']);

console.log('postCompatibilityService subject scoring tests passed');
