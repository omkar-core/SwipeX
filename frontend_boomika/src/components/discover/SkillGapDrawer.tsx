import React, { useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, BookOpen, TrendingUp } from 'lucide-react';
import { Job } from '../../types';
import { useResume } from '../../context/ResumeContext';

interface SkillGapDrawerProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

const LEARN_LINKS: Record<string, string> = {
  'GraphQL': 'https://graphql.org/learn/',
  'Design Tokens': 'https://spectrum.adobe.com/page/design-tokens/',
  'Storybook': 'https://storybook.js.org/',
  'TypeScript': 'https://www.typescriptlang.org/docs/',
  'Linear': 'https://linear.app/docs',
  'Next.js': 'https://nextjs.org/learn',
  'Tailwind CSS': 'https://tailwindcss.com/docs',
};

/**
 * Feature 2 — Skill Gap Flash Drawer
 * Slides in from the right after saving a job.
 * Shows matched skills (green) and missing skills (red) with learn links.
 */
export const SkillGapDrawer: React.FC<SkillGapDrawerProps> = ({ job, isOpen, onClose }) => {
  const { resume } = useResume();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const userSkills = new Set(resume.parsed_skills.map(s => s.toLowerCase().trim()));
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  const skillsList = job.skills_required || job.skills || [];
  skillsList.forEach(skill => {
    const norm = skill.toLowerCase().trim();
    const matched = userSkills.has(norm) ||
      Array.from(userSkills).some(us => us.includes(norm) || norm.includes(us));
    if (matched) matchedSkills.push(skill);
    else missingSkills.push(skill);
  });

  const matchPct = skillsList.length > 0
    ? Math.round((matchedSkills.length / skillsList.length) * 100)
    : 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full z-50 w-full max-w-sm bg-white dark:bg-[#111827] shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col animate-slide-in-right"
        style={{ animation: 'slideInRight 0.3s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Skill Gap Analysis</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{job.title} @ {job.company}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Match score mini bar */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                Skill Match Rate
              </span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{matchPct}%</span>
            </div>
            <div className="h-2 bg-blue-100 dark:bg-blue-800/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${matchPct}%` }}
              />
            </div>
          </div>

          {/* Matched Skills */}
          {matchedSkills.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                You Already Have ({matchedSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40 px-2.5 py-1 rounded-md"
                  >
                    ✓ {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {missingSkills.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                Skills to Develop ({missingSkills.length})
              </h3>
              <div className="space-y-2.5">
                {missingSkills.map((skill) => {
                  const learnUrl = Object.entries(LEARN_LINKS).find(([k]) =>
                    skill.toLowerCase().includes(k.toLowerCase())
                  )?.[1];
                  return (
                    <div
                      key={skill}
                      className="flex items-center justify-between p-3 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg"
                    >
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        ! {skill}
                      </span>
                      {learnUrl && (
                        <a
                          href={learnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          <BookOpen className="w-3 h-3" />
                          Learn
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {missingSkills.length === 0 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Perfect Skill Match!</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your resume covers all required skills for this role.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-md transition-colors"
          >
            Got it, continue swiping
          </button>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};
