import mongoose from 'mongoose';

const majorSettingSchema = new mongoose.Schema(
  {
    majorId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'collecting', 'closed'],
      default: 'active'
    },
    threshold: {
      type: Number,
      default: null,
      min: 1
    }
  },
  { _id: false }
);

const levelSettingSchema = new mongoose.Schema(
  {
    levelId: { type: String, required: true, trim: true },
    majors: { type: [majorSettingSchema], default: [] }
  },
  { _id: false }
);

const facultySettingSchema = new mongoose.Schema(
  {
    facultyId: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    levels: { type: [levelSettingSchema], default: [] }
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
    currentTermType: {
      type: String,
      enum: ['odd', 'even'],
      default: 'odd'
    },
    faculties: {
      type: [facultySettingSchema],
      default: []
    }
  },
  { timestamps: true }
);

const AcademicSetting = mongoose.model('AcademicSetting', academicSettingSchema);

export default AcademicSetting;
