export type UserRole = 'candidate' | 'recruiter' | 'admin';

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
