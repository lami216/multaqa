import mongoose from 'mongoose';

const majorSchema = new mongoose.Schema({
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
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

majorSchema.index({ facultyId: 1 });
majorSchema.index({ active: 1 });

const Major = mongoose.model('Major', majorSchema);

export default Major;
