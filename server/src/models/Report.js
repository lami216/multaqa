import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['user', 'post', 'chat', 'message']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: String,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'resolved'],
    default: 'pending'
  }
}, {
  timestamps: true
});

reportSchema.index({ reporterId: 1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ status: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
