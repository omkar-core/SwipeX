import React from 'react';
import {
  FileText,
  Trophy,
  Eye,
  Send,
  CheckSquare,
  Award,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  UploadCloud
} from 'lucide-react';
import { ResumePerformanceItem } from '../../types/milestone4';

interface ResumePerformancePanelProps {
  performance?: ResumePerformanceItem[];
  onNavigateToResume?: () => void;
}

export const ResumePerformancePanel: React.FC<ResumePerformancePanelProps> = ({
  performance,
  onNavigateToResume,
}) => {
  if (!performance || performance.length === 0) {
    return (
      <div
        className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-8 shadow-xs text-center space-y-4"
        data-testid="resume-performance-empty"
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Resume Version Performance Insights
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Upload a resume and apply to jobs to see version performance, recruiter view rates, and interview conversion metrics.
          </p>
        </div>
        {onNavigateToResume && (
          <button
            onClick={onNavigateToResume}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <span>Upload & Manage Resumes</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // Find best performer by shortlist rate or shortlists count
  const bestPerformer = performance.reduce((best, curr) => {
    const currRate = curr.shortlist_rate > 1 ? curr.shortlist_rate / 100 : curr.shortlist_rate;
    const bestRate = best.shortlist_rate > 1 ? best.shortlist_rate / 100 : best.shortlist_rate;
    return currRate > bestRate ? curr : best;
  }, performance[0]);

  return (
    <div
      className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-6"
      data-testid="resume-performance-panel"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Resume Version Performance & A/B Benchmark
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Compare recruiter views, shortlist conversion rates, and interview invitations across uploaded resume versions.
            </p>
          </div>
        </div>

        {onNavigateToResume && (
          <button
            onClick={onNavigateToResume}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Manage Versions</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Version Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {performance.map((item) => {
          const isBest = item.resume_id === bestPerformer.resume_id;
          const rateNormalized =
            item.shortlist_rate > 1
              ? Math.round(item.shortlist_rate)
              : Math.round(item.shortlist_rate * 100);

          const maxBarVal = Math.max(item.views, item.applies, item.shortlists, 10);
          const viewsPct = Math.round((item.views / maxBarVal) * 100);
          const appliesPct = Math.round((item.applies / maxBarVal) * 100);
          const shortlistsPct = Math.round((item.shortlists / maxBarVal) * 100);

          return (
            <div
              key={item.resume_id}
              className={`p-5 rounded-2xl border transition-all space-y-4 ${
                isBest
                  ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10 ring-1 ring-emerald-500/30'
                  : 'border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[260px]">
                      {item.version_label}
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    ID: {item.resume_id}
                  </span>
                </div>

                {isBest && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60"
                    data-testid="best-performer-badge"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    Best Performer
                  </span>
                )}
              </div>

              {/* 4 Stats Chips */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-white dark:bg-[#151D30] rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Views
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {item.views}
                  </span>
                </div>

                <div className="p-2 bg-white dark:bg-[#151D30] rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Applies
                  </span>
                  <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400">
                    {item.applies}
                  </span>
                </div>

                <div className="p-2 bg-white dark:bg-[#151D30] rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Shortlists
                  </span>
                  <span className="text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400">
                    {item.shortlists}
                  </span>
                </div>

                <div className="p-2 bg-white dark:bg-[#151D30] rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Interviews
                  </span>
                  <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {item.interviews}
                  </span>
                </div>
              </div>

              {/* Shortlist Rate Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Shortlist Conversion Rate
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                    {rateNormalized}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(rateNormalized, 100)}%` }}
                  />
                </div>
              </div>

              {/* Grouped Comparison Bars (Views vs Applies vs Shortlists) */}
              <div className="p-3 bg-white dark:bg-[#151D30] rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Funnel Engagement Distribution
                </span>
                
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 text-slate-500 text-[10px] font-semibold">Views:</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400 dark:bg-slate-500 rounded-full"
                        style={{ width: `${viewsPct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-bold text-[10px] text-slate-700 dark:text-slate-300">
                      {item.views}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 text-slate-500 text-[10px] font-semibold">Applies:</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${appliesPct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-bold text-[10px] text-slate-700 dark:text-slate-300">
                      {item.applies}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 text-slate-500 text-[10px] font-semibold">Shortlists:</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${shortlistsPct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-bold text-[10px] text-slate-700 dark:text-slate-300">
                      {item.shortlists}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
