import React, { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useJobFeed } from '../../hooks/useJobFeed';
import { SwipeDeck } from './SwipeDeck';
import { FiltersPanel, FiltersState } from './FiltersPanel';
import { MatchRing } from './MatchRing';
import { SkillGapDrawer } from './SkillGapDrawer';
import { SwipeStatsWidget } from './SwipeStatsWidget';
import { JobDetailModal } from './JobDetailModal';
import { Job } from '../../types';
import { Check } from 'lucide-react';

export const DiscoverScreen: React.FC = () => {
  const { user } = useAuth();
  
  // Milestone 2 Data Abstraction Hook
  const {
    jobs,
    currentIndex,
    currentJob,
    nextJob,
    canUndo,
    recordSwipe,
    undoLastSwipe,
    resetDeck
  } = useJobFeed();

  // Feature 2: Skill Gap Drawer state
  const [skillGapJob, setSkillGapJob] = useState<Job | null>(null);
  const [isSkillGapOpen, setIsSkillGapOpen] = useState(false);

  // Feature 7: Job Detail Modal state
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Swipe action with events
  const handleSwipe = useCallback(async (jobId: string | number, direction: 'right' | 'left') => {
    if (direction === 'right') {
      window.dispatchEvent(new CustomEvent('swipex:swipe', { detail: { direction: 'right' } }));
      if (currentJob) {
        setSkillGapJob(currentJob);
        setIsSkillGapOpen(true);
      }
    } else {
      window.dispatchEvent(new CustomEvent('swipex:swipe', { detail: { direction: 'left' } }));
    }
    await recordSwipe(jobId, direction);
  }, [currentJob, recordSwipe]);

  // Undo swipe handler
  const handleUndo = useCallback(async (): Promise<Job | null> => {
    return await undoLastSwipe();
  }, [undoLastSwipe]);

  const openJobDetail = useCallback((job: Job) => {
    setDetailJob(job);
    setIsDetailOpen(true);
  }, []);

  const handleApplyFilters = useCallback((filters: FiltersState) => {
    console.debug('[DiscoverScreen] Applied filters (Local state):', filters);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: User Profile & Discovery Filters Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* User Mini Profile Card */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-3.5 mb-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0">
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
                  {user?.title || 'Senior Frontend Engineer'}
                </p>
              </div>
            </div>

            {/* User Skills Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(user?.skills || ['React', 'TypeScript', 'Tailwind CSS', 'Next.js']).slice(0, 4).map(skill => (
                <span key={skill} className="text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/40">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Filters Panel Scaffold (Day 2 Component) */}
          <FiltersPanel onApplyFilters={handleApplyFilters} />
        </div>

        {/* Center Column: Framer Motion Swipe Deck */}
        <div className="lg:col-span-5 flex flex-col items-center">
          {currentJob && (
            <div className="w-full max-w-lg flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                  {currentIndex + 1} of {jobs.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MatchRing score={currentJob.match_score ?? currentJob.ats_match_score ?? 92} size="sm" />
                <button
                  onClick={() => openJobDetail(currentJob)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Details →
                </button>
              </div>
            </div>
          )}

          <SwipeDeck
            jobs={jobs}
            currentIndex={currentIndex}
            currentJob={currentJob}
            nextJob={nextJob}
            canUndo={canUndo}
            onSwipe={handleSwipe}
            onUndo={handleUndo}
            onReset={resetDeck}
            onViewDetails={openJobDetail}
          />
        </div>

        {/* Right Column: Quick Peek Panel */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Quick Peek
            </h3>

            {/* Company Section */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Company Overview
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {currentJob?.company_info || currentJob?.company_overview || 'High-impact product engineering team solving global challenges with modern tech.'}
              </p>
            </div>

            {/* Key Benefits */}
            <div className="mt-5">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Key Benefits
              </h4>
              <ul className="space-y-2">
                {(currentJob?.key_benefits || currentJob?.benefits || [
                  '100% Remote flexibility',
                  'Unlimited PTO policy',
                  '$3,000 Home office setup',
                ]).map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <div className="w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 flex-shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Primary Tools */}
            <div className="mt-5">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Primary Tools
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(currentJob?.primary_tools || ['React', 'TypeScript', 'Tailwind', 'Figma']).map((tool, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Feature 2: Skill Gap Drawer */}
      {skillGapJob && (
        <SkillGapDrawer
          job={skillGapJob}
          isOpen={isSkillGapOpen}
          onClose={() => setIsSkillGapOpen(false)}
        />
      )}

      {/* Feature 7: Job Detail Modal */}
      {detailJob && (
        <JobDetailModal
          job={detailJob}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onSave={async () => {
            await handleSwipe(detailJob.job_id, 'right');
            setIsDetailOpen(false);
          }}
          onPass={async () => {
            await handleSwipe(detailJob.job_id, 'left');
            setIsDetailOpen(false);
          }}
        />
      )}

      {/* Feature 3: Live Swipe Stats Widget */}
      <SwipeStatsWidget />
    </div>
  );
};
