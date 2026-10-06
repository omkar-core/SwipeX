import { Job } from '../types';

export const COMPETITION_THRESHOLDS = {
  lowMax: 9,      // 0-9: Low competition
  mediumMax: 29,  // 10-29: Medium competition
  // >= 30: High competition
} as const;

export const EARLY_APPLICANT_WINDOW_HOURS = 48;
export const EARLY_APPLICANT_MAX_APPLICANTS = 20;

export interface CompetitionTarget {
  applicant_count?: number;
  competition_level?: 'low' | 'medium' | 'high';
  posted_at?: string;
  early_applicant?: boolean;
}

/**
 * Returns the competition level for a job.
 * Prioritizes backend-provided competition_level, falls back to applicant_count thresholds.
 */
export function getCompetitionLevel(job?: CompetitionTarget | null): 'low' | 'medium' | 'high' {
  if (!job) return 'low';

  if (job.competition_level && ['low', 'medium', 'high'].includes(job.competition_level)) {
    return job.competition_level;
  }

  if (typeof job.applicant_count === 'number' && !isNaN(job.applicant_count)) {
    if (job.applicant_count <= COMPETITION_THRESHOLDS.lowMax) {
      return 'low';
    }
    if (job.applicant_count <= COMPETITION_THRESHOLDS.mediumMax) {
      return 'medium';
    }
    return 'high';
  }

  return 'low';
}

/**
 * Determines whether a job is eligible for the Early Applicant indicator:
 * Posted within the last 48 hours AND has 20 or fewer applicants.
 */
export function isEarlyApplicant(
  job?: (CompetitionTarget & Partial<Job>) | null,
  now: number = Date.now()
): boolean {
  if (!job) return false;

  if (typeof job.early_applicant === 'boolean') {
    return job.early_applicant;
  }

  if (!job.posted_at) return false;

  const postedTime = new Date(job.posted_at).getTime();
  if (isNaN(postedTime)) return false;

  const diffHours = (now - postedTime) / (1000 * 60 * 60);

  // If posted in future or within the early applicant window
  const isWithinWindow = diffHours >= 0 && diffHours <= EARLY_APPLICANT_WINDOW_HOURS;
  if (!isWithinWindow) return false;

  if (typeof job.applicant_count === 'number' && !isNaN(job.applicant_count)) {
    return job.applicant_count <= EARLY_APPLICANT_MAX_APPLICANTS;
  }

  return true;
}

/**
 * Converts a posted_at date string into a human-readable relative timestamp label.
 * e.g. "Just now", "5h ago", "2d ago", "3w ago", "2mo ago".
 */
export function getPostedLabel(postedAt?: string | null, now: number = Date.now()): string {
  if (!postedAt) return 'Recently';

  const postedTime = new Date(postedAt).getTime();
  if (isNaN(postedTime)) return 'Recently';

  const diffMs = now - postedTime;
  if (diffMs < 0) return 'Just now';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffHours < 1) {
    return 'Just now';
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return '1d ago';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  }
  return `${Math.max(1, diffMonths)}mo ago`;
}
