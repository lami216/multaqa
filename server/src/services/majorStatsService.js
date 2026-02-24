import mongoose from 'mongoose';
import MajorStats from '../models/MajorStats.js';

const scoreFormula = {
  posts: 3,
  matches: 5,
  users: 2
};

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const incrementStat = async (majorId, facultyId, field) => {
  const majorObjectId = toObjectId(majorId);
  const facultyObjectId = toObjectId(facultyId);

  if (!majorObjectId || !facultyObjectId) {
    return null;
  }

  const month = getCurrentMonth();
  return MajorStats.findOneAndUpdate(
    { majorId: majorObjectId },
    [
      {
        $set: {
          facultyId: facultyObjectId,
          currentMonth: {
            $cond: [{ $eq: ['$currentMonth', month] }, '$currentMonth', month]
          },
          monthlyPosts: {
            $cond: [{ $eq: ['$currentMonth', month] }, '$monthlyPosts', 0]
          },
          monthlyMatches: {
            $cond: [{ $eq: ['$currentMonth', month] }, '$monthlyMatches', 0]
          },
          monthlyUsers: {
            $cond: [{ $eq: ['$currentMonth', month] }, '$monthlyUsers', 0]
          }
        }
      },
      {
        $set: {
          allTimePosts: {
            $add: ['$allTimePosts', field === 'posts' ? 1 : 0]
          },
          allTimeMatches: {
            $add: ['$allTimeMatches', field === 'matches' ? 1 : 0]
          },
          allTimeUsers: {
            $add: ['$allTimeUsers', field === 'users' ? 1 : 0]
          },
          monthlyPosts: {
            $add: ['$monthlyPosts', field === 'posts' ? 1 : 0]
          },
          monthlyMatches: {
            $add: ['$monthlyMatches', field === 'matches' ? 1 : 0]
          },
          monthlyUsers: {
            $add: ['$monthlyUsers', field === 'users' ? 1 : 0]
          }
        }
      },
      {
        $set: {
          allTimeScore: {
            $add: [
              { $multiply: ['$allTimePosts', scoreFormula.posts] },
              { $multiply: ['$allTimeMatches', scoreFormula.matches] },
              { $multiply: ['$allTimeUsers', scoreFormula.users] }
            ]
          },
          monthlyScore: {
            $add: [
              { $multiply: ['$monthlyPosts', scoreFormula.posts] },
              { $multiply: ['$monthlyMatches', scoreFormula.matches] },
              { $multiply: ['$monthlyUsers', scoreFormula.users] }
            ]
          }
        }
      }
    ],
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

export const incrementPost = async (majorId, facultyId) => incrementStat(majorId, facultyId, 'posts');

export const incrementMatch = async (majorId, facultyId) => incrementStat(majorId, facultyId, 'matches');

export const incrementUser = async (majorId, facultyId) => incrementStat(majorId, facultyId, 'users');

