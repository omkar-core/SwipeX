import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { SwipeDeck } from './SwipeDeck';
import { FiltersPanel, FiltersState } from './FiltersPanel';
import { MatchRing } from './MatchRing';
import { SkillGapDrawer } from './SkillGapDrawer';
import { SwipeStatsWidget } from './SwipeStatsWidget';
import { JobDetailModal } from './JobDetailModal';
import { Job } from '../../types';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { ApiService } from '../../services/api';

export const DiscoverScreen: React.FC = () => {
  const { user } = useAuth();
  
  // Real JobContext backed by backend API
  const {
    jobs,
    currentIndex,
    currentJob,
    nextJob,
    canUndo,
    filters,
    setFilters,
    handleSwipe: postSwipeAction,
    undoLastSwipe,
    resetDeck
  } = useJobs();

  // Recommendations state
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    const loadRecs = async () => {
      if (!user?.user_id) return;
      setLoadingRecs(true);
      try {
        const res = await ApiService.getRecommendations(user.user_id);
        if (res && Array.isArray(res)) {
          setRecommendations(res);
        }
      } catch (err) {
        console.warn("Recommendations fetch:", err);
      } finally {
        setLoadingRecs(false);
      }
    };
    loadRecs();
  }, [user?.user_id]);

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
    await postSwipeAction(direction, jobId);
  }, [currentJob, postSwipeAction]);

  // Undo swipe handler
  const handleUndo = useCallback(async (): Promise<Job | null> => {
    return await undoLastSwipe();
  }, [undoLastSwipe]);

  const openJobDetail = useCallback(async (job: Job) => {
    setDetailJob(job);
    setIsDetailOpen(true);
    try {
      const fullDetail = await ApiService.getJobById(String(job.job_id));
      if (fullDetail) {
        setDetailJob(fullDetail);
      }
    } catch (err) {
      console.warn("Could not fetch full job details, using feed summary:", err);
    }
  }, []);

  const handleApplyFilters = useCallback((newFilters: FiltersState) => {
    setFilters(prev => ({
      ...prev,
      searchQuery: newFilters.searchQuery,
      salaryMin: newFilters.minSalary,
      workEnvironments: newFilters.workEnvironments as ('Remote' | 'Hybrid' | 'On-site')[],
    }));
  }, [setFilters]);

  const handleResetFilters = useCallback(() => {
    resetDeck();
    setFilters({
      industry: 'All',
      salaryMin: 40000,
      salaryMax: 270000,
      workEnvironments: ['Remote', 'Hybrid', 'On-site'],
      searchQuery: '',
    });
  }, [resetDeck, setFilters]);

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

          {/* Filters Panel Connected to Backend */}
          <FiltersPanel
            initialFilters={{
              searchQuery: filters.searchQuery || '',
              workEnvironments: filters.workEnvironments || ['Remote', 'Hybrid'],
              minSalary: filters.salaryMin || 60000,
            }}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
          />
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

            {/* Top AI Recommendations */}
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  AI Recommended Roles
                </h4>
                {loadingRecs && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
              </div>
              <div className="space-y-2">
                {recommendations.length === 0 && !loadingRecs ? (
                  <p className="text-[11px] text-slate-400 italic">No personalized recommendations available yet.</p>
                ) : (
                  recommendations.slice(0, 4).map((rec: any, idx) => (
                    <div
                      key={idx}
                      onClick={async () => {
                        try {
                          const j = await ApiService.getJobById(String(rec.job_id));
                          if (j) {
                            setDetailJob(j);
                            setIsDetailOpen(true);
                          }
                        } catch (e) {
                          console.warn("Could not fetch recommended job details", e);
                        }
                      }}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                          {rec.job_title || rec.title || `Role #${String(rec.job_id).slice(0, 8)}`}
                        </span>
                        <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                          {Math.round(rec.match_score ?? rec.match_percentage ?? 88)}% Match
                        </span>
                      </div>
                      {rec.location && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                          {rec.location}
                        </p>
                      )}
                    </div>
                  ))
                )}
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
