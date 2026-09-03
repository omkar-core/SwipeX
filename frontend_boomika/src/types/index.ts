export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface AdminDashboardData {
  total_users: number;
  total_recruiters: number;
  total_job_seekers: number;
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  pending_items: number;
}

export interface AdminUserRecord {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  created_at?: string;
  company_name?: string;
}

export interface AdminRecruiterRecord extends AdminUserRecord {
  designation?: string;
  job_count: number;
}

export interface AdminJobRecord {
  job_id: string;
  title: string;
  company: string;
  location: string;
  status: JobStatus;
  recruiter_id?: string;
  posted_at?: string;
  application_count: number;
}

export interface AdminApplicationRecord {
  application_id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  company: string;
  recruiter_id?: string;
  stage: string;
  applied_at?: string;
}

export interface AdminAnalyticsData {
  user_types: Record<string, number>;
  job_status: Record<string, number>;
  application_stages: Record<string, number>;
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  profile_picture_url?: string;
  title?: string;
  tier?: string;
  skills?: string[];
  phone?: string;
  location?: string;
  bio?: string;
  experience_years?: number;
  resume_url?: string;
  // Candidate-specific
  current_title?: string;
  expected_salary?: number;
  job_type_preference?: string;
  // Recruiter-specific
  company_name?: string;
  company_website?: string;
  designation?: string;
}

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  location?: string;
  bio?: string;
  profile_picture_url?: string;
  skills: string[];
  experience_years?: number;
  resume_url?: string;
  // Candidate-specific
  current_title?: string;
  expected_salary?: number;
  job_type_preference?: string;
  // Recruiter-specific
  company_name?: string;
  company_website?: string;
  designation?: string;
}

export interface UserProfileUpdate {
  name?: string;
  phone?: string;
  location?: string;
  bio?: string;
  profile_picture_url?: string;
  skills?: string[];
  experience_years?: number;
  resume_url?: string;
  current_title?: string;
  expected_salary?: number;
  job_type_preference?: string;
  company_name?: string;
  company_website?: string;
  designation?: string;
}


export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  role: UserRole;
}

export interface Job {
  job_id: number | string;
  title: string;
  company: string;
  location: string;
  salary_range: string;
  match_score?: number;
  ats_match_score?: number;
  is_hot_match?: boolean;
  description: string;
  skills_required?: string[];
  skills?: string[];
  company_info?: string;
  company_overview?: string;
  key_benefits?: string[];
  benefits?: string[];
  team_culture_quote?: string;
  team_culture_author?: string;
  culture_quote?: {
    quote: string;
    author: string;
  };
  primary_tools: string[];
  posted_at: string;
  company_logo?: string;
  banner_image?: string;
  type?: string;
  work_environment?: 'Remote' | 'Hybrid' | 'On-site';
  industry?: string;
  salary_min?: number;
  salary_max?: number;
  tags?: string[];
  match_badges?: string[];
}

export type SwipeDirection = 'left' | 'right' | 'up'; // left = pass, right = save / match

export interface SwipeRecord {
  swipe_id: string;
  job_id: number | string;
  direction: SwipeDirection;
  swiped_at: string;
}

export interface FilterState {
  industry: string;
  salaryMin: number;
  salaryMax: number;
  workEnvironments: ('Remote' | 'Hybrid' | 'On-site')[];
}

export interface TimelineItem {
  id: string;
  type: 'interview' | 'submitted' | 'viewed' | 'offer';
  title: string;
  company?: string;
  time: string;
  description: string;
  status?: string; // e.g. 'Active'
}

export interface RecommendedAction {
  id: string;
  icon: 'github' | 'summary' | 'skills' | 'portfolio';
  title: string;
  description: string;
}

export interface SavedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  logoLetter: string;
  logoBgColor: string;
  savedAt: string;
}

export interface ResumeData {
  resume_id: string;
  filename: string;
  file_size?: string;
  uploaded_at: string;
  parsed_skills: string[];
  overall_fit_score: number;
  format_compatibility: 'High' | 'Medium' | 'Low';
  status: 'uploading' | 'analyzing' | 'parsed' | 'error';
  progress: number;
}

export interface ATSScoreResult {
  match_score: number;
  missing_keywords: string[];
  generated_by: string;
}

export interface JobRecommendation {
  job_id: string;
  match_percentage: number;
  generated_by: string;
}

export type JobStatus = 'active' | 'closed' | 'draft';

export type PipelineStage = 'New' | 'Shortlisted' | 'Interviewing' | 'Offered' | 'Rejected';

export interface RecruiterJob extends Job {
  status?: JobStatus;
  recruiter_id?: string;
  applicant_count?: number;
  job_type?: string;
}

export interface ApplicantCandidateProfile {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  profile_picture_url?: string;
  skills: string[];
  resume_url?: string;
  current_title?: string;
  experience_years?: number;
  expected_salary?: number;
}

export interface Applicant {
  application_id: string;
  job_id: string | number;
  candidate_id: string;
  candidate: ApplicantCandidateProfile;
  stage: PipelineStage;
  match_score: number;
  applied_at: string;
  updated_at?: string;
  notes?: string;
}

export interface CreateJobInput {
  title: string;
  company: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  salary_range?: string;
  work_environment?: 'Remote' | 'Hybrid' | 'On-site';
  industry?: string;
  job_type?: string;
  description?: string;
  skills?: string[];
  status?: JobStatus;
}

export interface RecruiterAnalyticsData {
  total_jobs: number;
  active_jobs: number;
  closed_jobs: number;
  draft_jobs: number;
  total_applicants: number;
  stage_counts: Record<PipelineStage, number>;
  avg_time_to_hire_days: number;
}

export interface CandidateFunnelCounts {
  applied: number;
  shortlisted: number;
  interviewing: number;
  offered: number;
  rejected: number;
}

export interface CandidateSkillGapItem {
  skill: string;
  count: number;
  percentage: number;
  learn_url?: string;
}

export interface CandidateScoreTrendItem {
  date: string;
  score: number;
  job_title?: string;
  company?: string;
}

export interface CandidateIndustryEngagementItem {
  industry: string;
  count: number;
  percentage: number;
}

export interface CandidateActivityDayItem {
  date: string;
  day: string;
  count: number;
  level: number;
}

export interface CandidateAnalyticsData {
  total_swipes: number;
  applications_sent: number;
  profile_view_rate: number;
  profile_view_trend: string;
  avg_match_score: number;
  funnel_counts: CandidateFunnelCounts;
  top_skills_gap: CandidateSkillGapItem[];
  top_skills_matched?: string[];
  score_trend: CandidateScoreTrendItem[];
  top_industries: CandidateIndustryEngagementItem[];
  activity_heatmap: CandidateActivityDayItem[];
  generated_at?: string;
}


