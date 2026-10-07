import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  stateHash: { type: String, required: true, unique: true },
  bindingHash: { type: String, required: true, select: false },
  provider: { type: String, enum: ['google', 'telegram'], required: true },
  intent: { type: String, enum: ['login', 'link'], required: true },
  nonce: { type: String, required: true, select: false },
  verifier: { type: String, required: true, select: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tokenVersion: Number,
  expiresAt: { type: Date, required: true }
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('AuthFlow', schema);
