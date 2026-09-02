import React, { useEffect, useState, useCallback } from 'react';
import { ChevronDown, Check, RotateCcw } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useJobs } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { SwipeCard } from './SwipeCard';
import { MatchRing } from './MatchRing';
import { SkillGapDrawer } from './SkillGapDrawer';
import { SwipeStatsWidget } from './SwipeStatsWidget';
import { JobDetailModal } from './JobDetailModal';
import { Job } from '../../types';

export const DiscoverScreen: React.FC = () => {
  const { user } = useAuth();
  const {
    jobs,
    currentIndex,
    currentJob,
    filters,
    saveCurrentJob,
    passCurrentJob,
    resetDeck,
    toggleWorkEnvironment,
    setIndustry,
    setSalaryRange,
  } = useJobs();

  // ── Feature 2: Skill Gap Drawer state ─────────────────────────────────────
  const [skillGapJob, setSkillGapJob] = useState<Job | null>(null);
  const [isSkillGapOpen, setIsSkillGapOpen] = useState(false);

  // ── Feature 7: Job Detail Modal state ─────────────────────────────────────
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ── Keyboard shortcut listener (ArrowLeft / ArrowRight) ──────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        passCurrentJob();
      } else if (e.key === 'ArrowRight') {
        saveCurrentJob();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [passCurrentJob, saveCurrentJob]);

  // ── Dispatch swipe event for SwipeStatsWidget (Feature 3) ─────────────────
  const handleSaveWithStats = useCallback(async () => {
    if (currentJob) {
      window.dispatchEvent(new CustomEvent('swipex:swipe', { detail: { direction: 'right' } }));
      // Show Skill Gap drawer after right-swipe
      setSkillGapJob(currentJob);
      setIsSkillGapOpen(true);
    }
    await saveCurrentJob();
  }, [currentJob, saveCurrentJob]);

  const handlePassWithStats = useCallback(async () => {
    if (currentJob) {
      window.dispatchEvent(new CustomEvent('swipex:swipe', { detail: { direction: 'left' } }));
    }
    await passCurrentJob();
  }, [currentJob, passCurrentJob]);

  const handleSwipeGesture = useCallback(async (direction: 'left' | 'right') => {
    if (direction === 'right') {
      await handleSaveWithStats();
    } else {
      await handlePassWithStats();
    }
  }, [handleSaveWithStats, handlePassWithStats]);

  const openJobDetail = useCallback(() => {
    if (currentJob) {
      setDetailJob(currentJob);
      setIsDetailOpen(true);
    }
  }, [currentJob]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: User Profile & Discovery Filters */}
        <div className="lg:col-span-3 space-y-6">
          {/* User Mini Profile Card */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-subtle">
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                <img
                  src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                  alt={user?.name || "Alex Mercer"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {user?.name || 'Alex Mercer'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {user?.title || 'Senior Product Designer'}
                </p>
              </div>
            </div>

            {/* User Skills Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(user?.skills || ['UX/UI', 'Figma', 'Design Systems']).slice(0, 4).map(skill => (
                <span key={skill} className="text-[11px] font-medium bg-[#EBF3FF] dark:bg-blue-900/20 text-[#2563EB] dark:text-blue-400 px-2.5 py-0.5 rounded border border-blue-100 dark:border-blue-800/40">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Discovery Filters Section */}
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Discovery Filters
            </h2>

            {/* Industry Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Industry
              </label>
              <div className="relative">
                <select
                  value={filters.industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer shadow-subtle"
                >
                  <option value="All">All Industries</option>
                  <option value="Technology">Technology</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Healthcare">Healthcare</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Salary Target Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Salary Target
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    defaultValue={`$${filters.salaryMin / 1000}k`}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/\D/g, '')) * 1000;
                      if (!isNaN(val)) setSalaryRange(val, filters.salaryMax);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-subtle"
                  />
                </div>
                <span className="text-slate-400 font-medium text-xs">-</span>
                <div className="relative flex-1">
                  <input
                    type="text"
                    defaultValue={`$${filters.salaryMax / 1000}k`}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/\D/g, '')) * 1000;
                      if (!isNaN(val)) setSalaryRange(filters.salaryMin, val);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-subtle"
                  />
                </div>
              </div>
            </div>

            {/* Work Environment Checkboxes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Work Environment
              </label>
              <div className="space-y-2">
                {(['Remote', 'Hybrid', 'On-site'] as const).map((env) => {
                  const isChecked = filters.workEnvironments.includes(env);
                  return (
                    <label
                      key={env}
                      className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 select-none cursor-pointer"
                    >
                      <div
                        onClick={() => toggleWorkEnvironment(env)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-[#2563EB] border-[#2563EB] text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-400'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{env}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Job Card */}
        <div className="lg:col-span-5 flex flex-col items-center min-h-[560px]">
          {currentJob ? (
            <div className="w-full max-w-[540px]">
              {/* Counter, Hot Match & Match Score Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                    {currentIndex + 1} of {jobs.length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Match Ring */}
                  <MatchRing score={currentJob.match_score ?? currentJob.ats_match_score ?? 85} size="sm" />
                  {/* Quick detail link */}
                  <button
                    onClick={openJobDetail}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    View Details →
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <SwipeCard
                  key={currentJob.job_id}
                  job={currentJob}
                  onSwipe={handleSwipeGesture}
                  onSave={handleSaveWithStats}
                  onPass={handlePassWithStats}
                />
              </AnimatePresence>

              {/* Keyboard hint */}
              <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-3 font-medium">
                ← Arrow keys to swipe · Click "View Details" to read more
              </p>
            </div>
          ) : (
            <div className="w-full max-w-[540px] bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center shadow-subtle my-auto">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">You're all caught up!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-2 max-w-sm mx-auto">
                No more jobs right now.
              </p>
              <button
                type="button"
                onClick={resetDeck}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Job Deck</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Quick Peek Panel */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-700/60 p-6 shadow-subtle">
            <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-700">
              Quick Peek
            </h3>

            {/* Company Section */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Company
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {currentJob?.company_info || currentJob?.company_overview || 'Information not available.'}
              </p>
            </div>

            {/* Key Benefits */}
            <div className="mt-5">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Key Benefits
              </h4>
              <ul className="space-y-2">
                {(currentJob?.key_benefits || currentJob?.benefits || [
                  'Premium Health/Dental/Vision',
                  'Unlimited PTO (Mandatory 3 weeks)',
                  'Home Office Stipend ($1,500)',
                ]).map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <div className="w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-[#2563EB] flex-shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Team Culture */}
            <div className="mt-5">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Team Culture
              </h4>
              <div className="bg-[#EFF6FF] dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg p-3.5">
                <p className="text-xs italic text-slate-800 dark:text-slate-200 leading-relaxed">
                  "{currentJob?.team_culture_quote || currentJob?.culture_quote?.quote || 'We operate with high momentum, fast feedback, and shared ownership.'}"
                </p>
                <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-2">
                  - {currentJob?.team_culture_author || currentJob?.culture_quote?.author || 'Executive Team'}
                </span>
              </div>
            </div>

            {/* Primary Tools */}
            <div className="mt-5">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Primary Tools
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(currentJob?.primary_tools || ['Figma', 'Linear', 'TypeScript']).map((tool, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-medium bg-[#F1F5F9] dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded border border-slate-200/80 dark:border-slate-600/40"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Feature 2: Skill Gap Drawer ─────────────────────────────────────── */}
      {skillGapJob && (
        <SkillGapDrawer
          job={skillGapJob}
          isOpen={isSkillGapOpen}
          onClose={() => setIsSkillGapOpen(false)}
        />
      )}

      {/* ── Feature 7: Job Detail Modal ──────────────────────────────────────── */}
      {detailJob && (
        <JobDetailModal
          job={detailJob}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onSave={handleSaveWithStats}
          onPass={handlePassWithStats}
        />
      )}

      {/* ── Feature 3: Live Swipe Stats Widget ──────────────────────────────── */}
      <SwipeStatsWidget />
    </div>
  );
};
