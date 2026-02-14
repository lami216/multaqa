import mongoose from 'mongoose';

const majorVisibilitySchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true
    },
    threshold: {
      type: Number,
      default: 20,
      min: 1
    }
  },
  { _id: false }
);

const academicSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'academic',
      unique: true,
      index: true
    },
    academicTermType: {
      type: String,
      enum: ['odd', 'even'],
      default: 'odd'
    },
    catalogVisibility: {
      faculties: {
        type: Map,
        of: Boolean,
        default: {}
      },
      majors: {
        type: Map,
        of: majorVisibilitySchema,
        default: {}
      }
    }
  },
  { timestamps: true }
);

const AcademicSetting = mongoose.model('AcademicSetting', academicSettingSchema);

export default AcademicSetting;
