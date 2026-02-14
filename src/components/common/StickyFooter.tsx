import React from 'react';

const StickyFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:bottom-0">
      <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">{children}</div>
    </div>
  );
};

export default StickyFooter;
