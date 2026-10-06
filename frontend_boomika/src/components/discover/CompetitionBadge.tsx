import React from 'react';
import { Users, Info } from 'lucide-react';
import { getCompetitionLevel, COMPETITION_THRESHOLDS } from '../../utils/competition';
import { Job } from '../../types';

export interface CompetitionBadgeProps {
  job?: Partial<Job> | { applicant_count?: number; competition_level?: 'low' | 'medium' | 'high' } | null;
  applicant_count?: number;
  competition_level?: 'low' | 'medium' | 'high';
  showCount?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const CompetitionBadge: React.FC<CompetitionBadgeProps> = ({
  job,
  applicant_count,
  competition_level,
  showCount = true,
  size = 'md',
  className = '',
}) => {
  const target = {
    applicant_count: applicant_count ?? job?.applicant_count,
    competition_level: competition_level ?? job?.competition_level,
  };

  const level = getCompetitionLevel(target);
  const count = target.applicant_count;

  const config = {
    low: {
      label: 'Low Competition',
      bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
      dotClass: 'bg-emerald-500',
      tooltip: `High visibility opportunity (<${COMPETITION_THRESHOLDS.lowMax + 1} applicants). Apply early for top recruiter attention.`,
    },
    medium: {
      label: 'Medium Competition',
      bgClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      dotClass: 'bg-amber-500',
      tooltip: `Moderate applicant volume (${COMPETITION_THRESHOLDS.lowMax + 1}-${COMPETITION_THRESHOLDS.mediumMax} applicants). Ensure your resume is ATS-tailored.`,
    },
    high: {
      label: 'High Competition',
      bgClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
      dotClass: 'bg-rose-500',
      tooltip: `High volume (${COMPETITION_THRESHOLDS.mediumMax + 1}+ applicants). Optimize resume keywords to pass initial screening.`,
    },
  }[level];

  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-md border shadow-2xs backdrop-blur-xs transition-colors ${config.bgClass} ${sizeClass} ${className}`}
      title={config.tooltip}
      data-testid="competition-badge"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <Users className="w-3 h-3 opacity-75" />
      <span>
        {showCount && typeof count === 'number' ? `${count} Applicants (${config.label})` : config.label}
      </span>
    </span>
  );
};
