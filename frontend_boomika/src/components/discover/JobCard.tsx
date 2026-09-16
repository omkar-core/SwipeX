import React from 'react';
import { 
  MapPin, 
  DollarSign, 
  X, 
  Heart, 
  RotateCcw, 
  Flame, 
  Sparkles, 
  Zap, 
  Clock, 
  Building2, 
  ExternalLink,
  Briefcase
} from 'lucide-react';
import { Job } from '../../types';
import { getJobImage } from '../../utils/getJobImage';

export interface JobCardProps {
  job: Job;
  onPass?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onViewDetails?: (job: Job) => void;
  isCurrent?: boolean;
  className?: string;
  showControls?: boolean;
}

/**
 * Reusable Job Card Component
 * Conforms to Milestone 2 Day 1 Wireframe & UX Specifications.
 */
export const JobCard: React.FC<JobCardProps> = ({
  job,
  onPass,
  onSave,
  onUndo,
  canUndo = false,
  onViewDetails,
  className = '',
  showControls = true
}) => {
  // Compute freshness indicator
  const getFreshnessLabel = (postedAt?: string) => {
    if (!postedAt) return null;
    const diffHours = (Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return '✨ New Today';
    if (diffHours < 48) return '🕒 1d ago';
    if (diffHours < 168) return `🕒 ${Math.floor(diffHours / 24)}d ago`;
    return null;
  };

  const freshness = getFreshnessLabel(job.posted_at);

  // Compute competition label
  const isLowCompetition = job.competition_level === 'low' || (job.applicant_count !== undefined && job.applicant_count < 10);
  const isHighCompetition = job.competition_level === 'high' || (job.applicant_count !== undefined && job.applicant_count >= 30);

  const displaySkills = (job.skills_required && job.skills_required.length > 0)
    ? job.skills_required
    : (job.skills || job.tags || ['React', 'TypeScript', 'Tailwind CSS']);

  return (
    <div className={`w-full bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col relative select-none transition-colors ${className}`}>
      
      {/* 1. Header Banner & Floating Badges */}
      <div className="h-44 sm:h-52 w-full relative bg-slate-900 overflow-hidden flex-shrink-0">
        <img
          src={job.banner_image || getJobImage(job.title, job.skills_required ?? job.skills)}
          alt={job.title}
          className="w-full h-full object-cover opacity-85 dark:opacity-75 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Top Badges (Hot Match / Freshness / Company Type) */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {job.company_type && (
              <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-slate-200 text-[11px] font-bold px-2.5 py-1 rounded-md shadow border border-white/20 dark:border-slate-700/50 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-500" />
                {job.company_type}
              </span>
            )}
            {freshness && (
              <span className="bg-emerald-500/95 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow backdrop-blur-md flex items-center gap-1">
                {freshness}
              </span>
            )}
          </div>

          {job.is_hot_match && (
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-md shadow-lg flex items-center gap-1 animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-white" />
              HOT MATCH
            </span>
          )}
        </div>
      </div>

      {/* 2. Brand Avatar & Core Info */}
      <div className="px-6 pb-6 pt-0 relative flex-1 flex flex-col justify-between">
        
        {/* Floating Brand Logo Offset */}
        <div className="relative -top-7 flex items-end justify-between mb-[-12px]">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 p-1.5 shadow-md border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden">
            {job.company_logo ? (
              <img src={job.company_logo} alt={job.company} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="w-full h-full bg-blue-600 text-white font-black text-xl flex items-center justify-center rounded-xl">
                {job.company ? job.company.charAt(0) : 'J'}
              </div>
            )}
          </div>

          {/* Work Environment Tag */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              {job.work_environment || 'Remote'}
            </span>
          </div>
        </div>

        {/* Job Title & Company */}
        <div className="mt-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            {job.title}
          </h2>
          <div className="flex items-center gap-2 mt-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 flex-wrap">
            <span className="text-slate-900 dark:text-slate-200 font-bold">{job.company}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {job.location}
            </span>
          </div>
        </div>

        {/* Salary & Competition Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Est. Salary</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{job.salary_range || 'Competitive'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              isLowCompetition 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' 
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Competition</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isLowCompetition ? '⚡ Low (<10 applicants)' : isHighCompetition ? '🔥 High Demand' : 'Medium Competition'}
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack & Required Skills */}
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2">Required Skills & Stack</p>
          <div className="flex flex-wrap gap-1.5">
            {displaySkills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/70"
              >
                {skill}
              </span>
            ))}
            {displaySkills.length > 5 && (
              <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                +{displaySkills.length - 5} more
              </span>
            )}
          </div>
        </div>

        {/* Short Description */}
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {job.description}
        </p>

        {/* View Details Link */}
        {onViewDetails && (
          <button
            type="button"
            onClick={() => onViewDetails(job)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center gap-1 py-1.5 mb-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <span>View Full Role & Benefits</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}

        {/* 3. Floating Action Controls (Undo / Pass / Save) */}
        {showControls && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-5">
            {/* Undo Button */}
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo last swipe"
              title="Undo last swipe"
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                canUndo 
                  ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 shadow-sm focus:ring-2 focus:ring-slate-400' 
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
              }`}
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Pass / Skip Button (Left) */}
            <button
              type="button"
              onClick={onPass}
              aria-label="Pass on this job (Arrow Left)"
              title="Pass (Arrow Left)"
              className="w-14 h-14 rounded-full border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 shadow-md flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <X className="w-7 h-7 stroke-[2.5]" />
            </button>

            {/* Save / Apply Button (Right) */}
            <button
              type="button"
              onClick={onSave}
              aria-label="Save and apply to this job (Arrow Right)"
              title="Save & Apply (Arrow Right)"
              className="w-14 h-14 rounded-full border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 shadow-md flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <Heart className="w-7 h-7 stroke-[2.5] fill-emerald-600 dark:fill-emerald-400" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
