import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema({
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
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

facultySchema.index({ active: 1 });

const Faculty = mongoose.model('Faculty', facultySchema);

export default Faculty;
