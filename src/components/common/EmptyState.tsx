import type React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/80 p-8 text-center shadow-sm">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 text-emerald-700 shadow-inner">
      <Icon size={24} />
    </div>
    <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </div>
);

export default EmptyState;
