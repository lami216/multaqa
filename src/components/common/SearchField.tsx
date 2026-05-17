import type React from 'react';
import { Search } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
}

const SearchField: React.FC<SearchFieldProps> = ({ value, onChange, placeholder, label }) => (
  <label className="block text-start">
    {label ? <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span> : null}
    <span className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm transition focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-100/70">
      <Search size={18} className="text-slate-400 transition group-focus-within:text-emerald-600" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-6 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus:border-transparent focus:ring-0"
      />
    </span>
  </label>
);

export default SearchField;
