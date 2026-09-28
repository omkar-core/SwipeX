import React, { useState } from 'react';
import { 
  FileText, 
  Check, 
  Mail, 
  Eye, 
  Lightbulb, 
  Bookmark, 
  FileEdit,
  ArrowRight,
  Sparkles,
  ExternalLink,
  LayoutList,
  Columns3,
  Trophy
} from 'lucide-react';

import { useJobs } from '../../context/JobContext';
import { useResume } from '../../context/ResumeContext';
import { useToast } from '../../context/ToastContext';
import { KanbanBoard } from './KanbanBoard';
import { ProfileStrengthMeter } from './ProfileStrengthMeter';


interface ApplicationsScreenProps {
  onNavigateToResume: () => void;
}

export const ApplicationsScreen: React.FC<ApplicationsScreenProps> = ({ onNavigateToResume }) => {
  const { savedJobs, timeline, recommendedActions } = useJobs();
  const { atsResult } = useResume();
  const { showToast } = useToast();
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  // Feature 4: Kanban vs Timeline view toggle
  const [viewMode, setViewMode] = useState<'timeline' | 'kanban'>('timeline');


  const displayedTimeline = filterActiveOnly 
    ? timeline.filter(t => t.status === 'Active') 
    : timeline;

  const currentMatchScore = atsResult?.match_score || 85;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Area: Top ATS Match Card + Bottom Timeline (col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Top Card: ATS Match Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-subtle flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            
            {/* Circular ATS Gauge */}
            <div className="flex-shrink-0 flex items-center justify-center relative">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="#EBF3FF"
                  strokeWidth="11"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="#2563EB"
                  strokeWidth="11"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - (currentMatchScore / 100))}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Gauge Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {currentMatchScore}
                </span>
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-1 leading-tight">
                  ATS<br />MATCH
                </span>
              </div>
            </div>

            {/* Job Details & Action Buttons */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                  Senior Product Designer
                </h2>
                <p className="text-sm font-medium text-slate-600 mt-1">
                  Stripe • Remote, US
                </p>
              </div>

              {/* Match Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                <span className="text-xs font-semibold bg-[#E0EDFE] text-[#2563EB] px-3 py-1 rounded-md">
                  Figma Expert
                </span>
                <span className="text-xs font-semibold bg-[#E0EDFE] text-[#2563EB] px-3 py-1 rounded-md">
                  Design Systems
                </span>
                <span className="text-xs font-semibold bg-[#FEE2E2] text-[#EF4444] px-3 py-1 rounded-md">
                  Requires Portfolio Link
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
                <button
                  type="button"
                  onClick={onNavigateToResume}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                >
                  <span>Update Resume</span>
                  <FileText className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsAnalysisModalOpen(true)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-md transition-colors shadow-subtle cursor-pointer"
                >
                  View Analysis
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Card: Application Timeline / Kanban Board */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 sm:p-8 shadow-subtle">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Application Pipeline
              </h3>
              <div className="flex items-center gap-3">
                {/* Feature 4: View Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      viewMode === 'timeline'
                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    Timeline
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      viewMode === 'kanban'
                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <Columns3 className="w-3.5 h-3.5" />
                    Kanban
                  </button>

                </div>

                {viewMode === 'timeline' && (
                  <button
                    type="button"
                    onClick={() => setFilterActiveOnly(!filterActiveOnly)}
                    className={`text-xs font-semibold cursor-pointer transition-colors ${
                      filterActiveOnly ? 'text-blue-700 dark:text-blue-400 underline' : 'text-[#2563EB] hover:underline'
                    }`}
                  >
                    {filterActiveOnly ? 'Show All' : 'Filter Active'}
                  </button>
                )}
              </div>
            </div>

            {/* Feature 4: Kanban Board */}
            {viewMode === 'kanban' ? (
              <div className="pt-4">
                <KanbanBoard timeline={timeline} />
              </div>
            ) : (
              /* Vertical Timeline Items */
              <div className="relative pt-6 pl-4 space-y-6">
                {/* Vertical Connector Line */}
                <div className="absolute left-[31px] top-9 bottom-9 w-0.5 bg-slate-200 dark:bg-slate-700" />

                {displayedTimeline.map((item, idx) => {
                  const isInterview = item.type === 'interview';
                  const isSubmitted = item.type === 'submitted';
                  const isViewed = item.type === 'viewed';
                  const isOffer = item.type === 'offer';

                  return (
                    <div key={item.id || idx} className="relative flex items-start gap-4">
                      {/* Icon Node */}
                      <div className="relative z-10 flex-shrink-0">
                        {isOffer && (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                            <Trophy className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        )}
                        {isInterview && (
                          <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-sm">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        )}
                        {isSubmitted && (
                          <div className="w-8 h-8 rounded-full bg-[#EBF3FF] dark:bg-blue-900/20 text-[#2563EB] dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
                            <Mail className="w-4 h-4" />
                          </div>
                        )}
                        {isViewed && (
                          <div className="w-8 h-8 rounded-full bg-[#EBF3FF] dark:bg-slate-700/40 text-slate-600 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-600">
                            <Eye className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Timeline Card */}
                      <div className="flex-1 bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-xl p-4 sm:p-5 shadow-subtle hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </h4>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                          {item.description}
                        </p>

                        {item.status && (
                          <div className="mt-3">
                            <span className="inline-block bg-[#DCFCE7] dark:bg-green-900/20 text-[#16A34A] dark:text-green-400 text-[11px] font-bold px-2.5 py-0.5 rounded">
                              {item.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Sidebar: Profile Strength + Recommended Actions + Recently Saved */}
        <div className="lg:col-span-4 space-y-6">

          {/* Feature 5: Profile Strength Meter */}
          <ProfileStrengthMeter onNavigateToResume={onNavigateToResume} />

          {/* RECOMMENDED ACTIONS Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              RECOMMENDED ACTIONS
            </h3>

            <div className="space-y-4">
              {/* Action 1: Add GitHub Link */}
              <div 
                onClick={() => showToast('Connecting GitHub integration...', 'info')}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-blue-100 transition-colors">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Add GitHub Link
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Boost dev role match by 15%
                  </p>
                </div>
              </div>

              {/* Action 2: Tailor Summary */}
              <div 
                onClick={() => {
                  onNavigateToResume();
                  showToast('Opened Resume Optimization panel', 'info');
                }}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-blue-100 transition-colors">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Tailor Summary
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For "Product Designer" roles
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RECENTLY SAVED Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                RECENTLY SAVED
              </h3>
              <button
                type="button"
                onClick={() => showToast('Showing all saved roles', 'info')}
                className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {savedJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    {/* Logo Square */}
                    <div className="w-9 h-9 rounded-lg bg-[#E2E8F0] flex items-center justify-center text-slate-800 font-bold text-sm">
                      {job.logoLetter}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {job.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {job.company} • {job.location}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Saved Bookmark"
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Analysis Modal */}
      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-900">ATS Match Analysis</h3>
              </div>
              <button
                onClick={() => setIsAnalysisModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-800 mb-2">
                <span>Match Affinity Score</span>
                <span className="text-blue-600 font-extrabold text-base">{currentMatchScore} / 100</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${currentMatchScore}%` }}></div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <h4 className="font-bold text-slate-900">Key Strengths:</h4>
              <p>✓ Strong Figma and Design Systems experience aligns with Stripe's Developer Experience team requirements.</p>
              <p>✓ 4+ years in enterprise user interface design and rapid prototyping.</p>
              
              <h4 className="font-bold text-slate-900 pt-2">Missing Keywords / Opportunities:</h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(atsResult?.missing_keywords || ['GraphQL Automation', 'Design Token Automation']).map((kw, idx) => (
                  <span key={idx} className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-medium">
                    ! {kw}
                  </span>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 pt-2">
                Evaluated by: {atsResult?.generated_by || 'SwipeX-Neural-ATS-v4.2'}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsAnalysisModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsAnalysisModalOpen(false);
                  onNavigateToResume();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5"
              >
                <span>Update Resume</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
