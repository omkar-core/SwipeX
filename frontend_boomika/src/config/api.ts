/**
 * SwipeX API Configuration
 * 
 * Milestone 1 (Frontend Mock) -> Milestone 2 (Real Backend Integration)
 * 
 * To switch to a real backend:
 * 1. Set VITE_USE_MOCK=false in your .env file
 * 2. Set VITE_BASE_API_URL=http://your-backend-host:port/api/v1 (e.g. http://localhost:8000/api/v1)
 */

export const API_CONFIG = {
  // Base URL for real backend REST endpoints
  BASE_URL: import.meta.env.VITE_BASE_API_URL || 'http://localhost:8000/api/v1',
  
  // Flag to toggle between real fetch calls and isolated mock fallback
  // Default is true when VITE_USE_MOCK is 'true' or not specified in dev
  USE_MOCK: import.meta.env.VITE_USE_MOCK === 'false' ? false : true,

  // Request timeout in milliseconds
  TIMEOUT_MS: 10000,

  // Local storage keys
  STORAGE_KEYS: {
    TOKEN: 'swipex_access_token',
    REFRESH_TOKEN: 'swipex_refresh_token',
    USER: 'swipex_user',
    SWIPES: 'swipex_swipes',
    RESUME: 'swipex_resume',
    RESUME_VERSIONS: 'swipex_resume_versions',
    ACTIVE_RESUME_ID: 'swipex_active_resume_id',
    SAVED_JOBS: 'swipex_saved_jobs',
    RECRUITER_JOBS: 'swipex_recruiter_jobs',
    RECRUITER_APPLICANTS: 'swipex_recruiter_applicants',
  }
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GOOGLE: '/auth/oauth/google',
    ME: '/auth/me',
  },
  JOBS: {
    LIST: '/jobs',
    DETAIL: (jobId: string) => `/jobs/${jobId}`,
    RECOMMENDATIONS: '/jobs/recommendations',
  },
  SWIPES: {
    SUBMIT: '/swipes',
    HISTORY: '/swipes/history',
  },
  RESUMES: {
    UPLOAD: '/resumes/upload',
    LIST: '/resumes',
    PARSE: (resumeId: string) => `/resumes/${resumeId}/parse`,
    SET_DEFAULT: (resumeId: string) => `/resumes/${resumeId}/set-default`,
    DELETE: (resumeId: string) => `/resumes/${resumeId}`,
  },
  ATS: {
    SCORE: '/ats/score',
    SUGGESTIONS: '/ats/suggestions',
  },
  PROFILE: {
    ME: '/profile/me',
    UPDATE: '/profile/me',
    UPLOAD_PICTURE: '/profile/upload-picture',
  },
  RECRUITER: {
    JOBS: '/recruiter/jobs',
    JOB_STATUS: (jobId: string | number) => `/recruiter/jobs/${jobId}`,
    APPLICANTS: (jobId: string | number) => `/recruiter/jobs/${jobId}/applicants`,
    APPLICANT_STAGE: (applicationId: string) => `/recruiter/applicants/${applicationId}/stage`,
    ANALYTICS: '/recruiter/analytics',
  },
  ANALYTICS: {
    CANDIDATE_SUMMARY: '/analytics/candidate-summary',
  }
};


export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}
