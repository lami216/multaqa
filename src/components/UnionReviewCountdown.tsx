import React, { useEffect, useState } from 'react';

const pad = (v: number) => String(v).padStart(2, '0');

const UnionReviewCountdown: React.FC<{ startsAt: string }> = ({ startsAt }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const diff = new Date(startsAt).getTime() - now;
  const sign = diff >= 0 ? '-' : '+';
  const t = Math.abs(diff);
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  return <span className="font-mono text-sm font-black">{sign}{pad(h)}:{pad(m)}:{pad(s)}</span>;
};

export default UnionReviewCountdown;
