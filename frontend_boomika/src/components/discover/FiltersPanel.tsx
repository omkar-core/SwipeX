import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Building2, 
  MapPin, 
  DollarSign, 
  Sparkles, 
  Zap, 
  Clock, 
  RotateCcw,
  Check,
  Briefcase
} from 'lucide-react';

export interface FiltersState {
  searchQuery: string;
  companyTypes: string[];
  workEnvironments: string[];
  minSalary: number;
  fresherFriendly: boolean;
  lowCompetition: boolean;
  recentlyPosted: boolean;
}

export interface FiltersPanelProps {
  initialFilters?: Partial<FiltersState>;
  onApplyFilters?: (filters: FiltersState) => void;
  onResetFilters?: () => void;
  className?: string;
}

const DEFAULT_FILTERS: FiltersState = {
  searchQuery: '',
  companyTypes: [],
  workEnvironments: ['Remote', 'Hybrid'],
  minSalary: 60000,
  fresherFriendly: false,
  lowCompetition: false,
  recentlyPosted: false,
};

/**
 * FiltersPanel Component (UI Scaffold for Milestone 2)
 * Local state only for Day 2. Prepared to wire to /jobs/search on Day 4.
 */
export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  initialFilters,
  onApplyFilters,
  onResetFilters,
  className = ''
}) => {
  const [filters, setFilters] = useState<FiltersState>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  const companyTypeOptions = [
    { label: 'MNCs (500+)', value: 'MNC' },
    { label: 'High-Growth Startups', value: 'High-Growth Startup' },
    { label: 'Seed-Stage', value: 'Seed-Stage' }
  ];

  const workEnvOptions = ['Remote', 'Hybrid', 'On-site'];

  // Toggle company type
  const toggleCompanyType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      companyTypes: prev.companyTypes.includes(type)
        ? prev.companyTypes.filter(t => t !== type)
        : [...prev.companyTypes, type]
    }));
  };

  // Toggle work environment
  const toggleWorkEnv = (env: string) => {
    setFilters(prev => ({
      ...prev,
      workEnvironments: prev.workEnvironments.includes(env)
        ? prev.workEnvironments.filter(e => e !== env)
        : [...prev.workEnvironments, env]
    }));
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    if (onResetFilters) onResetFilters();
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (onApplyFilters) onApplyFilters(filters);
  };

  return (
    <div className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm transition-colors ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Discovery Filters
          </h3>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <form onSubmit={handleApply} className="space-y-6 pt-5">
        
        {/* 1. Search Query Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Search Keywords
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Job title, skills, or company..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* 2. Quick-Filter Chips */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Quick Filters
          </label>
          <div className="flex flex-wrap gap-2">
            {/* Fresher Friendly */}
            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, fresherFriendly: !prev.fresherFriendly }))}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                filters.fresherFriendly
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>✨ Fresher-Friendly</span>
            </button>

            {/* Low Competition */}
            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, lowCompetition: !prev.lowCompetition }))}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                filters.lowCompetition
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Low Competition</span>
            </button>

            {/* Recently Posted */}
            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, recentlyPosted: !prev.recentlyPosted }))}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                filters.recentlyPosted
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>🕒 Recently Posted</span>
            </button>
          </div>
        </div>

        {/* 3. Company Type Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Company Category
          </label>
          <div className="space-y-2">
            {companyTypeOptions.map(opt => {
              const isChecked = filters.companyTypes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleCompanyType(opt.value)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isChecked
                      ? 'border-blue-500/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>{opt.label}</span>
                  </div>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Work Environment Toggles */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Work Environment
          </label>
          <div className="grid grid-cols-3 gap-2">
            {workEnvOptions.map(env => {
              const isActive = filters.workEnvironments.includes(env);
              return (
                <button
                  key={env}
                  type="button"
                  onClick={() => toggleWorkEnv(env)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {env}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Minimum Salary Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Min. Annual Salary
            </label>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
              ${(filters.minSalary / 1000).toFixed(0)}k / yr
            </span>
          </div>
          <input
            type="range"
            min={40000}
            max={250000}
            step={5000}
            value={filters.minSalary}
            onChange={(e) => setFilters(prev => ({ ...prev, minSalary: Number(e.target.value) }))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>$40k</span>
            <span>$150k</span>
            <span>$250k+</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Apply Filters</span>
          </button>
        </div>

      </form>
    </div>
  );
};
