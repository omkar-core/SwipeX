import { ApplicationStatus, PipelineStage, UserRole } from '../types';

export interface StatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  description: string;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  saved: {
    label: 'Saved',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dotClass: 'bg-slate-400',
    borderClass: 'border-slate-300 dark:border-slate-700',
    description: 'Bookmarked / swiped right; ready for 1-click apply.',
  },
  applied: {
    label: 'Applied',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    dotClass: 'bg-blue-500',
    borderClass: 'border-blue-300 dark:border-blue-800',
    description: 'Application submitted and awaiting recruiter review.',
  },
  under_review: {
    label: 'Under Review',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    dotClass: 'bg-purple-500',
    borderClass: 'border-purple-300 dark:border-purple-800',
    description: 'Profile under review by hiring team.',
  },
  shortlisted: {
    label: 'Shortlisted',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    dotClass: 'bg-purple-500',
    borderClass: 'border-purple-300 dark:border-purple-800',
    description: 'Profile passed initial screening and talent match benchmarks.',
  },
  interview: {
    label: 'Interviewing',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    borderClass: 'border-amber-300 dark:border-amber-800',
    description: 'Invited for technical screening or hiring manager conversation.',
  },
  interviewing: {
    label: 'Interviewing',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    borderClass: 'border-amber-300 dark:border-amber-800',
    description: 'Invited for technical screening or hiring manager conversation.',
  },
  technical_assessment: {
    label: 'Technical Assessment',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    borderClass: 'border-indigo-300 dark:border-indigo-800',
    description: 'Take-home assessment or live technical interview in progress.',
  },
  offered: {
    label: 'Offered',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    borderClass: 'border-emerald-300 dark:border-emerald-800',
    description: 'Offer extended by hiring company.',
  },
  offer_extended: {
    label: 'Offer Extended',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    borderClass: 'border-emerald-300 dark:border-emerald-800',
    description: 'Offer extended by hiring company.',
  },
  rejected: {
    label: 'Archived / Rejected',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    dotClass: 'bg-rose-500',
    borderClass: 'border-rose-300 dark:border-rose-800',
    description: 'Position filled, application declined, or withdrawn.',
  },
  withdrawn: {
    label: 'Withdrawn',
    badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dotClass: 'bg-slate-400',
    borderClass: 'border-slate-300 dark:border-slate-700',
    description: 'Application withdrawn by candidate.',
  },
};

export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  saved: ['applied', 'rejected', 'withdrawn'],
  applied: ['under_review', 'shortlisted', 'interview', 'interviewing', 'technical_assessment', 'rejected', 'withdrawn'],
  under_review: ['shortlisted', 'interview', 'interviewing', 'technical_assessment', 'rejected', 'withdrawn'],
  shortlisted: ['interview', 'interviewing', 'technical_assessment', 'offered', 'offer_extended', 'rejected', 'withdrawn'],
  interview: ['offered', 'offer_extended', 'shortlisted', 'technical_assessment', 'rejected', 'withdrawn'],
  interviewing: ['offered', 'offer_extended', 'shortlisted', 'technical_assessment', 'rejected', 'withdrawn'],
  technical_assessment: ['interview', 'interviewing', 'offered', 'offer_extended', 'rejected', 'withdrawn'],
  offered: ['rejected', 'withdrawn'],
  offer_extended: ['rejected', 'withdrawn'],
  rejected: [],
  withdrawn: [],
};

const CANDIDATE_ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  saved: ['applied', 'rejected', 'withdrawn'],
  applied: ['rejected', 'withdrawn'],
  under_review: ['rejected', 'withdrawn'],
  shortlisted: ['rejected', 'withdrawn'],
  interview: ['rejected', 'withdrawn'],
  interviewing: ['rejected', 'withdrawn'],
  technical_assessment: ['rejected', 'withdrawn'],
  offered: ['rejected', 'withdrawn'],
  offer_extended: ['rejected', 'withdrawn'],
  rejected: [],
  withdrawn: [],
};

/**
 * Validates whether transitioning from one status to another is permitted,
 * taking optional user role into account.
 */
export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  role?: UserRole | 'system'
): boolean {
  if (from === to) return false;
  if (isTerminal(from)) return false;

  if (role === 'candidate') {
    const allowed = CANDIDATE_ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Maps recruiter PipelineStage to canonical ApplicationStatus
 */
export function pipelineStageToStatus(stage: PipelineStage): ApplicationStatus {
  switch (stage) {
    case 'New':
      return 'applied';
    case 'Shortlisted':
      return 'shortlisted';
    case 'Interviewing':
      return 'interview';
    case 'Offered':
      return 'offered';
    case 'Rejected':
      return 'rejected';
    default:
      return 'applied';
  }
}

/**
 * Maps canonical ApplicationStatus to recruiter PipelineStage
 */
export function statusToPipelineStage(status: ApplicationStatus): PipelineStage {
  switch (status) {
    case 'saved':
    case 'applied':
      return 'New';
    case 'shortlisted':
      return 'Shortlisted';
    case 'interview':
      return 'Interviewing';
    case 'offered':
      return 'Offered';
    case 'rejected':
      return 'Rejected';
    default:
      return 'New';
  }
}

/**
 * Checks if the application status is a terminal state
 */
export function isTerminal(status: ApplicationStatus | string): boolean {
  return status === 'rejected' || status === 'withdrawn';
}

/**
 * Extended configuration record covering all canonical & UI aliases
 */
export const STATUS_CONFIG: Record<string, {
  label: string;
  badgeBg: string;
  badgeClass: string;
  dotClass: string;
  borderColor: string;
  borderClass: string;
  description: string;
  iconName?: string;
}> = {
  saved: {
    label: 'Saved',
    badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dotClass: 'bg-slate-400',
    borderColor: 'border-slate-300',
    borderClass: 'border-slate-300 dark:border-slate-700',
    description: 'Bookmarked / swiped right; ready for 1-click apply.',
  },
  applied: {
    label: 'Applied',
    badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    dotClass: 'bg-blue-500',
    borderColor: 'border-blue-300',
    borderClass: 'border-blue-300 dark:border-blue-800',
    description: 'Application submitted and awaiting recruiter review.',
  },
  under_review: {
    label: 'Under Review',
    badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    dotClass: 'bg-purple-500',
    borderColor: 'border-purple-300',
    borderClass: 'border-purple-300 dark:border-purple-800',
    description: 'Profile under review by hiring team.',
  },
  shortlisted: {
    label: 'Shortlisted',
    badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    dotClass: 'bg-purple-500',
    borderColor: 'border-purple-300',
    borderClass: 'border-purple-300 dark:border-purple-800',
    description: 'Profile passed initial screening and talent match benchmarks.',
  },
  interview: {
    label: 'Interviewing',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    borderColor: 'border-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-800',
    description: 'Invited for technical screening or hiring manager conversation.',
  },
  interviewing: {
    label: 'Interviewing',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    borderColor: 'border-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-800',
    description: 'Invited for technical screening or hiring manager conversation.',
  },
  technical_assessment: {
    label: 'Technical Assessment',
    badgeBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    borderColor: 'border-indigo-300',
    borderClass: 'border-indigo-300 dark:border-indigo-800',
    description: 'Take-home assessment or live technical interview in progress.',
  },
  offered: {
    label: 'Offered',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    borderColor: 'border-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-800',
    description: 'Offer extended by hiring company.',
  },
  offer_extended: {
    label: 'Offer Extended',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    borderColor: 'border-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-800',
    description: 'Offer extended by hiring company.',
  },
  rejected: {
    label: 'Archived / Rejected',
    badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    dotClass: 'bg-rose-500',
    borderColor: 'border-rose-300',
    borderClass: 'border-rose-300 dark:border-rose-800',
    description: 'Position filled, application declined, or withdrawn.',
  },
  withdrawn: {
    label: 'Withdrawn',
    badgeBg: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dotClass: 'bg-slate-400',
    borderColor: 'border-slate-300',
    borderClass: 'border-slate-300 dark:border-slate-700',
    description: 'Application withdrawn by candidate.',
  },
};

/**
 * Alias for canTransition
 */
export function isValidTransition(
  from: any,
  to: any,
  role?: UserRole | 'system'
): boolean {
  if (from === to) return false;
  if (isTerminal(from)) return false;

  // Normalized transition map supporting all milestone 4 schemas
  const normalizedFrom = from === 'under_review' ? 'shortlisted' : from === 'technical_assessment' || from === 'interviewing' ? 'interview' : from === 'offer_extended' ? 'offered' : from;
  const normalizedTo = to === 'under_review' ? 'shortlisted' : to === 'technical_assessment' || to === 'interviewing' ? 'interview' : to === 'offer_extended' ? 'offered' : to;

  return canTransition(normalizedFrom as ApplicationStatus, normalizedTo as ApplicationStatus, role);
}

/**
 * Returns allowed next statuses for a given status
 */
export function getNextPossibleStatuses(from: any, role?: UserRole | 'system'): any[] {
  const normalized = from === 'under_review' ? 'shortlisted' : from === 'technical_assessment' || from === 'interviewing' ? 'interview' : from === 'offer_extended' ? 'offered' : from;
  const nextList = ALLOWED_TRANSITIONS[normalized as ApplicationStatus] || [];
  return nextList;
}

/**
 * Helper to normalize string input to canonical status
 */
export function toCanonicalStatus(statusOrStage: string): ApplicationStatus {
  if (!statusOrStage) return 'applied';
  const s = statusOrStage.toLowerCase();
  if (s === 'new' || s === 'applied') return 'applied';
  if (s === 'shortlisted' || s === 'under_review') return 'shortlisted';
  if (s === 'interview' || s === 'interviewing' || s === 'technical_assessment') return 'interview';
  if (s === 'offered' || s === 'offer_extended') return 'offered';
  if (s === 'rejected' || s === 'withdrawn') return 'rejected';
  if (s === 'saved') return 'saved';
  return 'applied';
}
