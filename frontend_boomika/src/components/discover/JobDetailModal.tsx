import React, { useEffect, useRef } from 'react';
import { X, MapPin, DollarSign, Building2, Briefcase, Check, Heart, Box, Tag } from 'lucide-react';
import { Job } from '../../types';
import { MatchRing } from './MatchRing';
import { CompetitionBadge } from './CompetitionBadge';
import { PostedTimeLabel } from './PostedTimeLabel';
import { EarlyApplicantBadge } from './EarlyApplicantBadge';

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onPass: () => void;
}

/**
 * Feature 7 — Job Detail Full-Page Modal
 * Slides up from the bottom as a full-screen overlay.
 * Shows complete job details: banner, description, benefits, tools, culture quote.
 * Has Save / Pass action buttons at the bottom.
 */
export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  onSave,
  onPass,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Reset scroll on open
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [isOpen, job]);

  if (!isOpen || !job) return null;

  const score = job.ats_match_score ?? 80;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Panel — slides up */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white dark:bg-[#111827] rounded-t-3xl shadow-2xl max-h-[92vh]"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 bg-white/90 dark:bg-slate-800/90 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 shadow hover:shadow-md z-10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* Banner Image */}
          <div className="h-48 w-full relative bg-slate-200 dark:bg-slate-700 overflow-hidden">
            {job.banner_image && (
              <img
                src={job.banner_image}
                alt={job.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="px-6 pb-28">
            {/* Header: logo + title + match ring */}
            <div className="flex items-start justify-between gap-4 -mt-8 mb-5">
              <div className="flex items-end gap-3">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-md flex items-center justify-center p-2 flex-shrink-0">
                  <div className="w-full h-full bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                    <Box className="w-7 h-7" />
                  </div>
                </div>
                <div className="pb-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{job.title}</h2>
                  <p className="text-sm font-semibold text-[#2563EB] mt-0.5">{job.company}</p>
                </div>
              </div>
              <div className="pt-2 flex-shrink-0">
                <MatchRing score={score} size="md" />
              </div>
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <PostedTimeLabel posted_at={job.posted_at} />
              <EarlyApplicantBadge job={job} size="sm" />
              <CompetitionBadge job={job} size="sm" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                {job.location}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                {job.salary_range}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Briefcase className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                {job.type}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                {job.industry}
              </div>
            </div>

            {/* Tags / Skills */}
            <div className="flex flex-wrap gap-2 mb-5">
              {(job.tags || job.skills_required || []).map((tag, i) => (
                <span
                  key={i}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border ${
                    i === 0
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40'
                      : 'bg-slate-50 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600/40'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">About the Role</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{job.description}</p>
            </div>

            {/* Company Overview */}
            {(job.company_info || job.company_overview) && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Company Overview</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{job.company_info || job.company_overview}</p>
              </div>
            )}

            {/* Benefits */}
            {(job.key_benefits || job.benefits) && (job.key_benefits || job.benefits)!.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Key Benefits</h3>
                <ul className="space-y-2">
                  {(job.key_benefits || job.benefits)!.map((b, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Primary Tools */}
            {job.primary_tools && job.primary_tools.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Primary Tools</h3>
                <div className="flex flex-wrap gap-2">
                  {job.primary_tools.map((tool, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600/60 px-3 py-1.5 rounded-lg"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Culture Quote */}
            {(job.team_culture_quote || job.culture_quote) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl p-4">
                <p className="text-sm italic text-slate-800 dark:text-slate-200 leading-relaxed">
                  "{job.team_culture_quote || job.culture_quote?.quote}"
                </p>
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
                  — {job.team_culture_author || job.culture_quote?.author}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom action bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-[#111827]/95 backdrop-blur border-t border-slate-100 dark:border-slate-700 px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => { onPass(); onClose(); }}
            className="flex-1 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Pass
          </button>
          <button
            onClick={() => { onSave(); onClose(); }}
            className="flex-[2] py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Heart className="w-4 h-4 fill-white" />
            Save This Role
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};
