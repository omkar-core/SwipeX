import React from 'react';
import { Zap } from 'lucide-react';
import { isEarlyApplicant, EARLY_APPLICANT_WINDOW_HOURS, EARLY_APPLICANT_MAX_APPLICANTS } from '../../utils/competition';
import { Job } from '../../types';

export interface EarlyApplicantBadgeProps {
  job?: (Partial<Job> & { applicant_count?: number; posted_at?: string; early_applicant?: boolean }) | null;
  className?: string;
  size?: 'sm' | 'md';
}

export const EarlyApplicantBadge: React.FC<EarlyApplicantBadgeProps> = ({
  job,
  className = '',
  size = 'md',
}) => {
  const isEligible = isEarlyApplicant(job);

  if (!isEligible) return null;

  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 font-black rounded-md bg-amber-500 text-white shadow-2xs backdrop-blur-xs border border-amber-400/60 transition-transform hover:scale-105 ${sizeClass} ${className}`}
      title={`Early Applicant Advantage: Posted within ${EARLY_APPLICANT_WINDOW_HOURS} hours with <= ${EARLY_APPLICANT_MAX_APPLICANTS} applicants. Early applicants receive 3x interview callback rate.`}
      data-testid="early-applicant-badge"
    >
      <Zap className="w-3 h-3 fill-white text-white animate-pulse" />
      <span>Early Applicant</span>
    </span>
  );
};
