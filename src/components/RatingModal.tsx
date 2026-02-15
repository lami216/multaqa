import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { submitSessionRating } from '../lib/http';

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  targetUserId: string;
}

const RatingModal: React.FC<RatingModalProps> = ({ open, onClose, sessionId, targetUserId }) => {
  const [score, setScore] = useState(0);
  const [review, setReview] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!score) return;
    setSaving(true);
    try {
      await submitSessionRating(sessionId, { targetUserId, score, review });
      onClose();
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
        <div className="flex justify-end gap-2">
          <button type="button" className="secondary-btn" onClick={onClose}>Skip</button>
          <button type="button" className="primary-btn" disabled={!score || saving} onClick={handleSubmit}>Submit</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
