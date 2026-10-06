import { UserRole } from './index';

export type NotificationType = 
  | 'instant_job' 
  | 'startup_hiring' 
  | 'high_match' 
  | 'low_competition' 
  | 'application_status' 
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  job_id?: string | number;
  application_id?: string;
  match_percentage?: number;
  created_at: string;
  read: boolean;
  channel?: 'in_app' | 'email' | 'push';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  deep_link?: string;
}

export interface AlertPreferences {
  types: Record<NotificationType, boolean>;
  channels: {
    in_app: boolean;
    email: boolean;
    push: boolean;
  };
  match_threshold: number; // 50 to 95, default 80
  quiet_hours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
}

export type ApplicationStatus = 
  | 'saved' 
  | 'applied' 
  | 'under_review'
  | 'shortlisted' 
  | 'interview' 
  | 'interviewing'
  | 'technical_assessment'
  | 'offered' 
  | 'offer_extended'
  | 'rejected'
  | 'withdrawn';

export interface StatusHistoryEntry {
  id: string;
  from_status?: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_at: string;
  actor: 'candidate' | 'recruiter' | 'system' | UserRole;
  note?: string;
}

export type ApplicationStatusEvent = StatusHistoryEntry;

export interface ApplicationItem {
  id: string;
  job_id: string | number;
  candidate_id?: string;
  title: string;
  company: string;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
  resume_version_id?: string;
  match_score?: number;
  match_percentage?: number;
  location?: string;
  salary?: string;
  salary_range?: string;
  notes?: string;
  status_history: StatusHistoryEntry[];
}

export type Application = ApplicationItem;

export interface ResumePerformanceItem {
  resume_id: string;
  version_label: string;
  views: number;
  applies: number;
  shortlists: number;
  interviews: number;
  shortlist_rate: number; // e.g. 0.35 for 35% or percentage value
}

export interface RecommendationInsight {
  job_id: string | number;
  title: string;
  company: string;
  reasons: string[];
  match_percentage: number;
}

export interface SwipeBehaviorSummary {
  total_swipes: number;
  right_swipes: number;
  left_swipes: number;
  right_swipe_ratio: number;
  top_industry: string;
  avg_saved_match: number;
}

export type HiringTrendRange = '7d' | '30d' | '90d' | { from: string; to: string };

export interface HiringTrendData {
  jobs_posted: { date: string; count: number }[];
  top_skills: { skill: string; count: number; percentage?: number }[];
  startup_vs_mnc: { date: string; startup: number; mnc: number }[];
  kpis?: {
    total_jobs: number;
    pct_change: number;
    top_skill: string;
    startup_share_pct: number;
  };
}

export interface AdminAnalyticsData {
  total_users: number;
  active_jobs: number;
  total_applications: number;
  avg_time_to_hire_days: number;
  platform_application_trend: { date: string; count: number }[];
  user_growth: { date: string; candidates: number; recruiters: number }[];
  role_split: { role: string; count: number; percentage: number }[];
  hiring_trend_summary?: {
    total_posted_last_30d: number;
    top_skill: string;
    startup_share: number;
  };
}
