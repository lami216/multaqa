import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  nameAr: {
    type: String,
    required: true,
    trim: true
  },
  nameFr: {
    type: String,
    required: true,
    trim: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  majorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Major',
    required: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

subjectSchema.index({ facultyId: 1 });
subjectSchema.index({ majorId: 1 });
subjectSchema.index({ active: 1 });

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;
