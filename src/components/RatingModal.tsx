import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { submitSessionRating } from '../lib/http';

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  sessionId: string;
  targetUserId: string;
}

const RatingModal: React.FC<RatingModalProps> = ({ open, onClose, onSubmitted, sessionId, targetUserId }) => {
  const [score, setScore] = useState(0);
  const [review, setReview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
  }, [open]);

  const handleSubmit = async () => {
    if (!score) return;
    setSaving(true);
    setError('');
    try {
      await submitSessionRating(sessionId, { targetUserId, score, review });
      onSubmitted?.();
      onClose();
    } catch (submitError) {
      setError('Unable to submit rating right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    setError('');
    try {
      await submitSessionRating(sessionId, { targetUserId, score: 0 });
      onSubmitted?.();
      onClose();
    } catch (submitError) {
      setError('Unable to skip rating right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md space-y-4">
        <DialogHeader>
          <DialogTitle>Rate study partner</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" onClick={() => setScore(value)}>
              <Star className={value <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
            </button>
          ))}
        </div>
        <textarea
          value={review}
          onChange={(event) => setReview(event.target.value)}
          placeholder="Write a review (optional)"
          className="w-full"
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="secondary-btn" disabled={saving} onClick={handleSkip}>Skip</button>
          <button type="button" className="primary-btn" disabled={!score || saving} onClick={handleSubmit}>Submit</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
