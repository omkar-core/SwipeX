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
  
  // Base URL for WebSocket notifications (auto-upgrades to wss in HTTPS environments)
  WS_URL: import.meta.env.VITE_WS_URL || 
    (typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? 'wss://localhost:8000/ws/notifications'
      : 'ws://localhost:8000/ws/notifications'),

  // Flag to toggle between real fetch calls and isolated mock fallback
  // Default is true in test runner (Vitest) to maintain isolated offline unit tests.
  // In dev/prod browser runtime, strictly obeys VITE_USE_MOCK (.env).
  USE_MOCK: import.meta.env.MODE === 'test'
    ? true
    : (import.meta.env.VITE_USE_MOCK === 'false' ? false : true),

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
    NOTIFICATIONS: 'swipex_notifications',
    ALERT_PREFERENCES: 'swipex_alert_preferences',
    APPLICATIONS: 'swipex_applications',
  }
};

// Production misconfiguration diagnostic check
if (
  import.meta.env.PROD &&
  !API_CONFIG.USE_MOCK &&
  (API_CONFIG.BASE_URL.includes('localhost') || API_CONFIG.BASE_URL.includes('127.0.0.1'))
) {
  console.error(
    '[SwipeX Config Warning] Running in PRODUCTION with USE_MOCK=false, but VITE_BASE_API_URL points to localhost (%s). Please configure a production backend API domain in your hosting environment variables.',
    API_CONFIG.BASE_URL
  );
}

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GOOGLE: '/auth/oauth/google',
    ME: '/auth/me',
  },
  JOBS: {
    LIST: '/jobs',
    DETAIL: (jobId: string | number) => `/jobs/${jobId}`,
    RECOMMENDATIONS: '/jobs/recommendations',
    COMPETITION: (jobId: string | number) => `/jobs/${jobId}/competition`,
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
  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all',
    PREFERENCES: '/notifications/preferences',
  },
  APPLICATIONS: {
    LIST: '/applications',
    APPLY: '/applications',
    DETAIL: (id: string) => `/applications/${id}`,
    STATUS: (id: string) => `/applications/${id}/status`,
    HISTORY: (id: string) => `/applications/${id}/history`,
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
    RECRUITER_SUMMARY: '/analytics/recruiter-summary',
    ADMIN_SUMMARY: '/analytics/admin-summary',
    HIRING_TRENDS: '/analytics/hiring-trends',
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
