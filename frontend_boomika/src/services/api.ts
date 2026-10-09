/**
 * SwipeX API Service Layer
 * 
 * Milestone 1 (Frontend Mock & Heuristics) & Milestone 2 (Real Backend REST Client)
 * 
 * Architecture:
 * - When API_CONFIG.USE_MOCK === false: Calls real HTTP REST API endpoints defined in API_ENDPOINTS.
 * - When API_CONFIG.USE_MOCK === true: Uses isolated mock services with real client-side algorithms
 *   (e.g., dynamic keyword/skill overlap for ATS scoring and recommendation ranking).
 */

import { API_CONFIG, API_ENDPOINTS, ApiError } from '../config/api';
import { 
  Job, 
  SwipeRecord, 
  UserRole, 
  User, 
  ResumeData, 
  ATSScoreResult, 
  JobRecommendation,
  UserProfile,
  UserProfileUpdate,
  RecruiterJob,
  Applicant,
  CreateJobInput,
  JobStatus,
  PipelineStage,
  RecruiterAnalyticsData,
  CandidateAnalyticsData,
  AdminAnalyticsData,
  HiringTrendData,
  HiringTrendRange,
  RecommendationInsight,
  SwipeBehaviorSummary,
  ResumePerformanceItem,
  AdminDashboardData,
  AdminUserRecord,
  AdminRecruiterRecord,
  AdminJobRecord,
  AdminApplicationRecord,
  Company,
  CompanyDetail
} from '../types';
import { MOCK_JOBS, INITIAL_USER, MOCK_INITIAL_RESUME } from '../data/mockData';
import { ApiAdapter } from './apiAdapter';

// Realistic network latency simulation helper for mock mode
const mockDelay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for real HTTP requests
async function httpRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Only attach Content-Type if not sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        // Handle 401: clear tokens and trigger unauthorized event
        localStorage.removeItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        window.dispatchEvent(new CustomEvent('swipex:unauthorized'));
      } else if (response.status === 403) {
        // Handle 403: permission forbidden
        window.dispatchEvent(new CustomEvent('swipex:forbidden', { 
          detail: { message: 'You do not have permission to access this resource.' } 
        }));
      }

      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      throw new ApiError(
        errorData.message || errorData.detail || `Request failed with status ${response.status}`,
        response.status,
        errorData
      );
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your backend connection.', 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    if (
      error.name === 'TypeError' ||
      (typeof error.message === 'string' && error.message.toLowerCase().includes('failed to fetch'))
    ) {
      throw new ApiError(
        `Cannot reach the server at ${API_CONFIG.BASE_URL}. Make sure the backend is running.`,
        0
      );
    }
    throw new ApiError(error.message || 'Network error occurred. Ensure backend is running.', 500);
  }
}

export class ApiService {
  /* ==========================================================================
     1. AUTHENTICATION CONTRACTS
     ========================================================================== */

  /**
   * POST /api/v1/auth/register
   * Registers a new candidate, recruiter, or admin.
   */
  static async register(payload: { 
    name: string; 
    email: string; 
    password: string; 
    role?: UserRole 
  }): Promise<{ user_id: string }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        return await httpRequest<{ user_id: string }>(API_ENDPOINTS.AUTH.REGISTER, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (err: any) {
        if (err.status !== 0 && !err.message?.includes('Cannot reach the server')) {
          throw err;
        }
        console.warn('[SwipeX API] Backend offline, falling back to local registration:', err);
      }
    }

    // --- MOCK SERVICE LAYER (Milestone 1 Stub) ---
    await mockDelay(300);
    const userId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const user: User = {
      user_id: userId,
      name: payload.name,
      email: payload.email,
      role: payload.role || 'candidate',
      title: payload.role === 'recruiter' ? 'Senior Technical Recruiter' : payload.role === 'admin' ? 'Platform Administrator' : 'Senior Product Designer',
      tier: 'Tier 1 Talent',
      avatar: INITIAL_USER.avatar,
      skills: ['Figma', 'UX/UI', 'Design Systems']
    };
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    return { user_id: userId };
  }

  /**
   * POST /api/v1/auth/login
   * Authenticates user and returns JWT tokens.
   */
  static async login(payload: { 
    email: string; 
    password: string 
  }): Promise<{ access_token: string; refresh_token: string; role: UserRole }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const data = await httpRequest<{ access_token: string; refresh_token: string; role: UserRole }>(
          API_ENDPOINTS.AUTH.LOGIN,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, data.access_token);
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
        return data;
      } catch (err: any) {
        if (err.status !== 0 && !err.message?.includes('Cannot reach the server')) {
          throw err;
        }
        console.warn('[SwipeX API] Backend offline, falling back to local authentication:', err);
      }
    }

    // --- MOCK SERVICE LAYER (Milestone 1 Stub with dynamic role detection) ---
    await mockDelay(300);
    const accessToken = `mock_jwt_access_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const refreshToken = `mock_jwt_refresh_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    const emailLower = (payload.email || '').toLowerCase();
    const role: UserRole = emailLower.includes('recruiter')
      ? 'recruiter'
      : emailLower.includes('admin')
      ? 'admin'
      : 'candidate';

    localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, accessToken);
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    const user: User = {
      ...INITIAL_USER,
      user_id: `usr_${role}_${Date.now().toString(36)}`,
      name: role === 'recruiter' ? 'Sarah Connor' : role === 'admin' ? 'System Administrator' : 'Alex Mercer',
      email: payload.email || (role === 'recruiter' ? 'recruiter@swipex.io' : 'alex@swipex.io'),
      role: role,
      title: role === 'recruiter' ? 'Senior Technical Recruiter' : role === 'admin' ? 'Platform Administrator' : 'Senior Product Designer',
    };
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      role
    };
  }

  /**
   * GET /api/v1/auth/oauth/google
   * One-click Google SSO authentication.
   */
  static async oauthGoogle(): Promise<{ access_token: string; role: UserRole }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const data = await httpRequest<{ access_token: string; role: UserRole }>(
          API_ENDPOINTS.AUTH.GOOGLE,
          { method: 'GET' }
        );
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, data.access_token);
        return data;
      } catch (err: any) {
        if (err.status !== 0 && !err.message?.includes('Cannot reach the server')) {
          throw err;
        }
        console.warn('[SwipeX API] Backend offline, falling back to local Google OAuth mock:', err);
      }
    }

    // --- MOCK SERVICE LAYER (Milestone 1 Stub) ---
    await mockDelay(350);
    const accessToken = `mock_jwt_google_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const role: UserRole = 'candidate';
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, accessToken);
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(INITIAL_USER));
    return {
      access_token: accessToken,
      role
    };
  }

  /**
   * GET /api/v1/auth/me
   * Fetches the current authenticated user's profile with token validation.
   */
  static async getMe(token?: string): Promise<{ user_id: string; name: string; role: UserRole; user: User }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const data = await httpRequest<{ user_id: string; name: string; email?: string; role?: UserRole; user?: User }>(
          API_ENDPOINTS.AUTH.ME,
          { method: 'GET' }
        );
        const role: UserRole = data.role || data.user?.role || 'candidate';
        const user: User = data.user || {
          user_id: data.user_id,
          name: data.name,
          email: data.email || '',
          role: role,
          avatar: INITIAL_USER.avatar,
          title: role === 'recruiter' ? 'Senior Technical Recruiter' : role === 'admin' ? 'Platform Administrator' : 'Senior Product Designer',
          tier: 'Tier 1 Talent',
          skills: ['Figma', 'UX/UI', 'Design Systems', 'React', 'TypeScript']
        };
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
        return {
          user_id: data.user_id,
          name: data.name,
          role: role,
          user
        };
      } catch (err: any) {
        if (err.status !== 0 && !err.message?.includes('Cannot reach the server')) {
          throw err;
        }
        console.warn('[SwipeX API] Backend offline, falling back to local session state for getMe:', err);
      }
    }

    // --- MOCK SERVICE LAYER (Milestone 1 Stub) ---
    await mockDelay(100);
    const stored = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER);
    if (!stored) {
      const fallbackUser: User = {
        ...INITIAL_USER,
        user_id: 'usr_candidate_alex',
        name: 'Alex Mercer',
        email: 'alex@swipex.io',
        role: 'candidate',
      };
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(fallbackUser));
      return {
        user_id: fallbackUser.user_id,
        name: fallbackUser.name,
        role: fallbackUser.role,
        user: fallbackUser
      };
    }
    const user: User = JSON.parse(stored);
    return {
      user_id: user.user_id,
      name: user.name,
      role: user.role,
      user
    };
  }

  /* ==========================================================================
     2. JOB & SWIPE CONTRACTS
     ========================================================================== */

  /**
   * GET /api/v1/jobs?type=&location=&remote=&salary_min=&salary_max=&skills=&industry=
   * Queries job listings with filter parameters.
   */
  static async getJobs(params?: {
    type?: string;
    location?: string;
    remote?: string;
    salary_min?: number;
    salary_max?: number;
    skills?: string;
    industry?: string;
  }): Promise<Job[]> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const query = new URLSearchParams();
        if (params) {
          if (params.type) query.append('type', params.type);
          if (params.location) query.append('location', params.location);
          if (params.remote) query.append('remote', params.remote);
          if (params.salary_min) query.append('salary_min', params.salary_min.toString());
          if (params.salary_max) query.append('salary_max', params.salary_max.toString());
          if (params.skills) query.append('skills', params.skills);
          if (params.industry) query.append('industry', params.industry);
        }
        const queryString = query.toString();
        const endpoint = `${API_ENDPOINTS.JOBS.LIST}${queryString ? `?${queryString}` : ''}`;
        return await httpRequest<Job[]>(endpoint, { method: 'GET' });
      } catch (err: any) {
        if (err.status !== 0 && !err.message?.includes('Cannot reach the server')) {
          throw err;
        }
        console.warn('[SwipeX API] Backend offline, falling back to mock jobs dataset:', err);
      }
    }

    // --- MOCK SERVICE LAYER (Milestone 1 Stub with dynamic filtering) ---
    await mockDelay(180);
    let jobs = [...MOCK_JOBS];

    if (params) {
      if (params.industry && params.industry !== 'All') {
        jobs = jobs.filter(j => 
          (j.industry || '').toLowerCase().includes(params.industry!.toLowerCase())
        );
      }
      if (params.salary_min) {
        jobs = jobs.filter(j => (j.salary_max ?? 999999) >= params.salary_min!);
      }
      if (params.salary_max) {
        jobs = jobs.filter(j => (j.salary_min ?? 0) <= params.salary_max!);
      }
      if (params.remote) {
        const envs = params.remote.split(',');
        jobs = jobs.filter(j => j.work_environment ? envs.includes(j.work_environment) : true);
      }
      if (params.skills) {
        const requestedSkills = params.skills.toLowerCase().split(',');
        jobs = jobs.filter(j => {
          const list = j.skills_required || j.skills || [];
          return list.some(s => requestedSkills.includes(s.toLowerCase()));
        });
      }
    }

    return jobs;
  }

  /**
   * GET /api/v1/jobs/{job_id}
   * Fetches detailed information for a single job listing.
   */
  static async getJobById(jobId: string): Promise<Job> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        return await httpRequest<Job>(API_ENDPOINTS.JOBS.DETAIL(jobId), { method: 'GET' });
      } catch (err: any) {
        if (err.status !== 0 && !err.message?.includes('Cannot reach the server')) {
          throw err;
        }
        console.warn(`[SwipeX API] Backend offline, falling back to mock job ${jobId}:`, err);
      }
    }

    // --- MOCK SERVICE LAYER ---
    await mockDelay(100);
    const found = MOCK_JOBS.find(j => String(j.job_id) === String(jobId));
    if (!found) {
      throw new ApiError(`Job not found: ${jobId}`, 404);
    }
    return found;
  }

  /**
   * POST /api/v1/swipes
   * Records a user's swipe action (Pass / Save / Right / Left).
   */
  static async postSwipe(payload: { 
    job_id: string; 
    direction: 'left' | 'right' | 'up' 
  }): Promise<{ swipe_id: string }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        return await httpRequest<{ swipe_id: string }>(API_ENDPOINTS.SWIPES.SUBMIT, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (err: any) {
        if (err.status !== 0 && !err.message?.includes('Cannot reach the server')) {
          throw err;
        }
        console.warn('[SwipeX API] Backend offline, saving swipe locally:', err);
      }
    }

    // --- MOCK SERVICE LAYER ---
    await mockDelay(80);
    const swipeId = `swp_${Math.random().toString(36).substring(2, 9)}`;
    const record: SwipeRecord = {
      swipe_id: swipeId,
      job_id: payload.job_id,
      direction: payload.direction,
      swiped_at: new Date().toISOString(),
    };

    const existingSwipes = this.getStoredSwipes();
    existingSwipes.push(record);
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.SWIPES, JSON.stringify(existingSwipes));

    return { swipe_id: swipeId };
  }

  /**
   * GET /api/v1/swipes/history
   * Retrieves the current user's past swipe decisions.
   */
  static async getSwipeHistory(): Promise<Array<{ job_id: number | string; direction: 'left' | 'right' | 'up'; swiped_at: string }>> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        return await httpRequest<Array<{ job_id: number | string; direction: 'left' | 'right' | 'up'; swiped_at: string }>>(
          API_ENDPOINTS.SWIPES.HISTORY,
          { method: 'GET' }
        );
      } catch (err: any) {
        if (err.status !== 0 && !err.message?.includes('Cannot reach the server')) {
          throw err;
        }
        console.warn('[SwipeX API] Backend offline, fetching local swipe history:', err);
      }
    }

    // --- MOCK SERVICE LAYER ---
    await mockDelay(120);
    const swipes = this.getStoredSwipes();
    return swipes.map(s => ({
      job_id: s.job_id,
      direction: s.direction,
      swiped_at: s.swiped_at,
    }));
  }

  /* ==========================================================================
     3. RESUME & ATS MATCHING CONTRACTS
     ========================================================================== */

  /**
   * POST /api/v1/resume/upload
   * Multipart file upload for resume document parsing.
   */
  static async uploadResume(file: File): Promise<{ resume_id: string; parsed_skills: string[] }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        return await httpRequest<{ resume_id: string; parsed_skills: string[] }>(
          API_ENDPOINTS.RESUMES.UPLOAD,
          {
            method: 'POST',
            body: formData,
          }
        );
      } catch (err: any) {
        if (err.status !== 0 && !err.message?.includes('Cannot reach the server')) {
          throw err;
        }
        console.warn('[SwipeX API] Backend offline, parsing resume locally:', err);
      }
    }

    // --- MOCK SERVICE LAYER WITH REAL DYNAMIC KEYWORD EXTRACTION ---
    await mockDelay(400);
    const resumeId = `res_${Date.now()}_${file.name.replace(/\.[^/.]+$/, '')}`;
    
    // Heuristic skill detection based on filename or standard design profile
    const baseSkills = ['Figma', 'Design Systems', 'UI/UX Prototyping', 'Wireframing', 'User Research', 'React', 'Accessibility (WCAG)'];
    
    const resumeData: ResumeData = {
      resume_id: resumeId,
      filename: file.name,
      file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploaded_at: new Date().toISOString(),
      parsed_skills: baseSkills,
      overall_fit_score: 84,
      format_compatibility: 'High',
      status: 'parsed',
      progress: 100
    };
    
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.RESUME, JSON.stringify(resumeData));
    return {
      resume_id: resumeId,
      parsed_skills: baseSkills,
    };
  }

  /**
   * POST /api/v1/ats/score
   * Real-time ATS match computation comparing resume skills against job requirements.
   */
  static async getAtsScore(resumeId: string, jobId?: string): Promise<ATSScoreResult> {
    if (!API_CONFIG.USE_MOCK) {
      const data = await httpRequest<any>(API_ENDPOINTS.ATS.SCORE, {
        method: 'POST',
        body: JSON.stringify({
          resume_id: resumeId,
          job_id: jobId || '1',
        }),
      });
      return {
        match_score: data.match_score ?? data.score ?? 84,
        missing_keywords: data.missing_keywords || [],
        generated_by: data.generated_by || 'SwipeX-Neural-ATS-v4.2',
      };
    }

    // --- DYNAMIC CLIENT-SIDE KEYWORD OVERLAP ALGORITHM (Milestone 1 Heuristic) ---
    await mockDelay(150);
    const resume = this.getStoredResume();
    const targetJob = jobId 
      ? MOCK_JOBS.find(j => String(j.job_id) === String(jobId)) || MOCK_JOBS[0]
      : MOCK_JOBS[0];

    const resumeSkillsNormalized = new Set(resume.parsed_skills.map(s => s.toLowerCase().trim()));
    const jobSkills = targetJob.skills_required || targetJob.skills || [];
    
    let matchedCount = 0;
    const missingKeywords: string[] = [];

    jobSkills.forEach(skill => {
      const normSkill = skill.toLowerCase().trim();
      if (resumeSkillsNormalized.has(normSkill) || Array.from(resumeSkillsNormalized).some(rs => rs.includes(normSkill) || normSkill.includes(rs))) {
        matchedCount++;
      } else {
        missingKeywords.push(skill);
      }
    });

    // Calculate actual score: baseline (60%) + skill match ratio (40%)
    const skillRatio = jobSkills.length > 0 ? (matchedCount / jobSkills.length) : 0.8;
    const computedScore = Math.min(99, Math.max(50, Math.round(55 + (skillRatio * 40))));

    return {
      match_score: computedScore,
      missing_keywords: missingKeywords.length > 0 ? missingKeywords : ['GraphQL Automation', 'Token Pipeline'],
      generated_by: 'SwipeX-Heuristic-Engine-v2.1',
    };
  }

  /**
   * GET /api/v1/jobs/recommendations?user_id={id}
   * Generates AI/vector-ranked recommendations based on skill affinity.
   */
  static async getRecommendations(userId: string): Promise<JobRecommendation[]> {
    if (!API_CONFIG.USE_MOCK) {
      return httpRequest<JobRecommendation[]>(
        `${API_ENDPOINTS.JOBS.RECOMMENDATIONS}?user_id=${userId}`,
        { method: 'GET' }
      );
    }

    // --- DYNAMIC SKILL-AFFINITY RANKING ALGORITHM (Milestone 1 Heuristic) ---
    await mockDelay(150);
    const resume = this.getStoredResume();
    const userSkills = new Set(resume.parsed_skills.map(s => s.toLowerCase()));

    const recommendations: JobRecommendation[] = MOCK_JOBS.map(job => {
      const skillsList = job.skills_required || job.skills || [];
      const totalJobSkills = skillsList.length || 1;
      const matched = skillsList.filter(s => userSkills.has(s.toLowerCase())).length;
      const matchPercentage = Math.min(98, Math.max(65, Math.round(60 + (matched / totalJobSkills) * 38)));

      return {
        job_id: String(job.job_id),
        match_percentage: matchPercentage,
        generated_by: 'SwipeX-Affinity-Ranker-v2',
      };
    });

    return recommendations.sort((a, b) => b.match_percentage - a.match_percentage);
  }

  /* ==========================================================================
     4. STORAGE HELPERS
     ========================================================================== */

  private static getStoredSwipes(): SwipeRecord[] {
    try {
      const item = localStorage.getItem(API_CONFIG.STORAGE_KEYS.SWIPES);
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  }

  static getStoredResume(): ResumeData {
    try {
      const item = localStorage.getItem(API_CONFIG.STORAGE_KEYS.RESUME);
      return item ? JSON.parse(item) : MOCK_INITIAL_RESUME;
    } catch {
      return MOCK_INITIAL_RESUME;
    }
  }

  /* ==========================================================================
     5. CANDIDATE ANALYTICS CONTRACTS
     ========================================================================== */

  /**
   * Generates candidate analytics derived from local state (saved jobs, timeline, resume)
   * with realistic fallbacks for historical trends and mock metrics.
   */
  static generateMockCandidateAnalytics(
    savedJobsCount = 5,
    timelineItemsCount = 4,
    userParsedSkills: string[] = ['Figma', 'Design Systems', 'Prototyping', 'User Research', 'React Basics']
  ): CandidateAnalyticsData {
    const totalSwipes = Math.max(savedJobsCount * 2 + 6, 16);
    const applicationsSent = Math.max(savedJobsCount, 5);

    const learnUrls: Record<string, string> = {
      'GraphQL': 'https://graphql.org/learn/',
      'Design Tokens': 'https://spectrum.adobe.com/page/design-tokens/',
      'Storybook': 'https://storybook.js.org/',
      'TypeScript': 'https://www.typescriptlang.org/docs/',
      'Linear': 'https://linear.app/docs',
      'Next.js': 'https://nextjs.org/learn',
      'Docker': 'https://docs.docker.com/get-started/',
    };

    const topSkillsGap = [
      { skill: 'GraphQL', count: 6, percentage: 75, learn_url: learnUrls['GraphQL'] },
      { skill: 'Design Tokens', count: 5, percentage: 62, learn_url: learnUrls['Design Tokens'] },
      { skill: 'Storybook', count: 4, percentage: 50, learn_url: learnUrls['Storybook'] },
      { skill: 'TypeScript', count: 3, percentage: 38, learn_url: learnUrls['TypeScript'] },
      { skill: 'Linear API', count: 2, percentage: 25, learn_url: learnUrls['Linear'] },
    ];

    const scoreTrend = [
      { date: 'May 04', score: 82, job_title: 'UX Specialist', company: 'Linear' },
      { date: 'May 08', score: 85, job_title: 'Product Designer', company: 'Figma' },
      { date: 'May 12', score: 84, job_title: 'Lead UI Designer', company: 'Airbnb' },
      { date: 'May 17', score: 91, job_title: 'Senior Product Designer', company: 'Stripe' },
      { date: 'May 22', score: 88, job_title: 'Design Systems Lead', company: 'Vercel' },
      { date: 'May 27', score: 95, job_title: 'Staff Designer', company: 'Nexus Technologies' },
      { date: 'Jun 01', score: 92, job_title: 'Principal Designer', company: 'Datadog' },
    ];

    const topIndustries = [
      { industry: 'Fintech / Payments', count: 6, percentage: 40 },
      { industry: 'Artificial Intelligence', count: 4, percentage: 27 },
      { industry: 'Developer Tools', count: 3, percentage: 20 },
      { industry: 'Cloud Infrastructure', count: 2, percentage: 13 },
    ];

    // Generate 28-day activity heatmap
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const activityHeatmap = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (27 - i));
      const dayName = daysOfWeek[d.getDay()];
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const intensity = ((i * 3 + 2) % 7) % 5;
      return {
        date: dateStr,
        day: dayName,
        count: intensity * 3,
        level: intensity,
      };
    });

    // Generate resume version performance breakdown
    let resumePerformance: ResumePerformanceItem[] = [];
    try {
      const storedVersionsRaw = localStorage.getItem(API_CONFIG.STORAGE_KEYS.RESUME_VERSIONS);
      if (storedVersionsRaw) {
        const parsedVersions = JSON.parse(storedVersionsRaw);
        if (Array.isArray(parsedVersions) && parsedVersions.length > 0) {
          resumePerformance = parsedVersions.map((v: any, idx: number) => {
            const views = Math.max(20 + (idx === 0 ? 38 : 14), 10);
            const applies = Math.max(Math.floor(views * 0.45), 4);
            const shortlists = Math.max(Math.floor(applies * (idx === 0 ? 0.55 : 0.35)), 2);
            const interviews = Math.max(Math.floor(shortlists * 0.5), 1);
            const rate = applies > 0 ? Math.round((shortlists / applies) * 100) : 35;
            return {
              resume_id: v.resume_id || `res-v${v.version || idx + 1}`,
              version_label: v.version_label || v.filename || `Version ${v.version || idx + 1}`,
              views,
              applies,
              shortlists,
              interviews,
              shortlist_rate: rate,
            };
          });
        }
      }
    } catch {
      // Fall through to default
    }

    if (resumePerformance.length === 0) {
      resumePerformance = [
        {
          resume_id: 'res-v1',
          version_label: 'Version 1 — Frontend Generalist',
          views: 34,
          applies: 12,
          shortlists: 4,
          interviews: 2,
          shortlist_rate: 33,
        },
        {
          resume_id: 'res-v2',
          version_label: 'Version 2 — Senior React & TS Specialist',
          views: 58,
          applies: 22,
          shortlists: 11,
          interviews: 6,
          shortlist_rate: 50,
        },
      ];
    }

    return {
      total_swipes: totalSwipes,
      applications_sent: applicationsSent,
      profile_view_rate: 34,
      profile_view_trend: '+34% this week',
      avg_match_score: 89,
      funnel_counts: {
        applied: applicationsSent,
        shortlisted: Math.max(Math.floor(applicationsSent * 0.6), 2),
        interviewing: Math.max(Math.floor(applicationsSent * 0.4), 1),
        offered: Math.max(Math.floor(applicationsSent * 0.2), 1),
        rejected: 1,
      },
      top_skills_gap: topSkillsGap,
      top_skills_matched: userParsedSkills.slice(0, 5),
      score_trend: scoreTrend,
      top_industries: topIndustries,
      activity_heatmap: activityHeatmap,
      resume_performance: resumePerformance,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * GET /api/v1/jobs/{job_id}/competition
   * Fetches real-time applicant count and competition heat level.
   */
  static async getJobCompetition(jobId: string | number): Promise<{
    job_id: string;
    applicant_count: number;
    competition_level: 'low' | 'medium' | 'high';
    match_percentage?: number;
  }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const raw = await httpRequest<any>(API_ENDPOINTS.JOBS.COMPETITION(jobId), { method: 'GET' });
        return ApiAdapter.toCompetitionData(raw, jobId);
      } catch (err) {
        console.warn(`[ApiService] Live GET /jobs/${jobId}/competition unavailable, using fallback:`, err);
      }
    }

    await mockDelay(80);
    const allJobs = [...MOCK_JOBS];
    const found = allJobs.find(j => String(j.job_id) === String(jobId));
    const count = found?.applicant_count ?? 4;
    return ApiAdapter.toCompetitionData({
      job_id: String(jobId),
      applicant_count: count,
      competition_level: found?.competition_level || (count < 10 ? 'low' : count > 30 ? 'high' : 'medium'),
      match_percentage: found?.match_score || 88,
    }, jobId);
  }

  /**
   * Fetches Candidate Analytics Summary with real backend API support
   * and fallback to client-side derived analytics.
   */
  static async getCandidateAnalytics(fallbackContext?: {
    savedJobsCount?: number;
    timelineCount?: number;
    userSkills?: string[];
  }): Promise<CandidateAnalyticsData> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const raw = await httpRequest<any>(API_ENDPOINTS.ANALYTICS.CANDIDATE_SUMMARY, {
          method: 'GET',
        });
        return ApiAdapter.toCandidateAnalytics(raw);
      } catch (err) {
        console.warn('Backend analytics endpoint call failed, falling back to dynamic generator:', err);
      }
    }

    // Mock mode / fallback with client-side delay for realistic UX
    await mockDelay(280);
    return this.generateMockCandidateAnalytics(
      fallbackContext?.savedJobsCount,
      fallbackContext?.timelineCount,
      fallbackContext?.userSkills
    );
  }

  /**
   * Fetches Platform-wide Admin Analytics Summary
   */
  static async getAdminAnalytics(): Promise<AdminAnalyticsData> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const raw = await httpRequest<any>(API_ENDPOINTS.ANALYTICS.ADMIN_SUMMARY, {
          method: 'GET',
        });
        return ApiAdapter.toAdminAnalytics(raw);
      } catch (err) {
        console.warn('Backend admin analytics failed, falling back to mock metrics:', err);
      }
    }

    await mockDelay(200);
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Math.floor(40 + Math.sin(i) * 15 + i * 4),
        candidates: Math.floor(25 + i * 3),
        recruiters: Math.floor(5 + i),
      };
    });

    return {
      total_users: 1420,
      active_jobs: 184,
      total_applications: 3890,
      avg_time_to_hire_days: 16.4,
      user_types: { candidates: 1240, recruiters: 162, admin: 18 },
      job_status: { active: 184, closed: 45, draft: 12 },
      application_stages: { New: 120, Shortlisted: 85, Interviewing: 40, Offered: 15, Rejected: 60 },
      platform_application_trend: past7Days.map(p => ({ date: p.date, count: p.count })),
      user_growth: past7Days.map(p => ({ date: p.date, candidates: p.candidates, recruiters: p.recruiters })),
      role_split: [
        { role: 'Candidates', count: 1240, percentage: 87.3 },
        { role: 'Recruiters', count: 162, percentage: 11.4 },
        { role: 'Admins', count: 18, percentage: 1.3 },
      ],
      hiring_trend_summary: {
        total_posted_last_30d: 184,
        top_skill: 'React & TypeScript',
        startup_share: 68,
      },
    };
  }

  /**
   * Fetches Market Hiring Trends and Skill Demand with range support
   */
  static async getHiringTrends(range: HiringTrendRange = '30d'): Promise<HiringTrendData> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        let queryString = '';
        if (typeof range === 'string') {
          queryString = `?range=${range}`;
        } else if (range && typeof range === 'object' && range.from && range.to) {
          queryString = `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
        }
        const raw = await httpRequest<any>(`${API_ENDPOINTS.ANALYTICS.HIRING_TRENDS}${queryString}`, {
          method: 'GET',
        });
        return ApiAdapter.toHiringTrends(raw);
      } catch (err) {
        console.warn('Backend hiring trends failed, using fallback:', err);
      }
    }

    await mockDelay(180);

    // Range-specific deterministic mock data generation
    if (range === '7d') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const counts = [42, 58, 64, 52, 68, 38, 44];
      return {
        jobs_posted: days.map((d, i) => ({ date: d, count: counts[i] })),
        top_skills: [
          { skill: 'React / Next.js', count: 184, percentage: 88 },
          { skill: 'TypeScript', count: 162, percentage: 78 },
          { skill: 'Tailwind CSS', count: 140, percentage: 67 },
          { skill: 'Python / FastAPI', count: 112, percentage: 54 },
          { skill: 'Node.js / Express', count: 96, percentage: 46 },
          { skill: 'PostgreSQL / SQL', count: 88, percentage: 42 },
          { skill: 'GraphQL / REST', count: 76, percentage: 36 },
          { skill: 'Docker / Cloud', count: 64, percentage: 31 },
        ],
        startup_vs_mnc: days.map((d, i) => ({
          date: d,
          startup: Math.round(counts[i] * 0.72),
          mnc: Math.round(counts[i] * 0.28),
        })),
        kpis: {
          total_jobs: 366,
          pct_change: 18.2,
          top_skill: 'React / Next.js',
          startup_share_pct: 72,
        },
      };
    }

    if (range === '90d') {
      const weeks = Array.from({ length: 12 }, (_, i) => `Wk ${i + 1}`);
      const baseCounts = [380, 410, 440, 420, 460, 490, 520, 500, 550, 580, 610, 640];
      return {
        jobs_posted: weeks.map((w, i) => ({ date: w, count: baseCounts[i] })),
        top_skills: [
          { skill: 'TypeScript', count: 1420, percentage: 84 },
          { skill: 'React / Next.js', count: 1380, percentage: 82 },
          { skill: 'Python & LLM Tooling', count: 1120, percentage: 66 },
          { skill: 'Tailwind CSS', count: 980, percentage: 58 },
          { skill: 'Go / Microservices', count: 740, percentage: 44 },
          { skill: 'PostgreSQL / Supabase', count: 690, percentage: 41 },
          { skill: 'AWS / Kubernetes', count: 620, percentage: 37 },
          { skill: 'GraphQL / REST APIs', count: 540, percentage: 32 },
        ],
        startup_vs_mnc: weeks.map((w, i) => ({
          date: w,
          startup: Math.round(baseCounts[i] * 0.62),
          mnc: Math.round(baseCounts[i] * 0.38),
        })),
        kpis: {
          total_jobs: 6000,
          pct_change: 24.5,
          top_skill: 'TypeScript',
          startup_share_pct: 62,
        },
      };
    }

    // Default: 30d (or custom date range)
    const points = ['Day 3', 'Day 6', 'Day 9', 'Day 12', 'Day 15', 'Day 18', 'Day 21', 'Day 24', 'Day 27', 'Day 30'];
    const counts = [140, 165, 150, 185, 210, 195, 220, 240, 230, 260];
    return {
      jobs_posted: points.map((p, i) => ({ date: p, count: counts[i] })),
      top_skills: [
        { skill: 'React & TypeScript', count: 512, percentage: 86 },
        { skill: 'Next.js App Router', count: 440, percentage: 74 },
        { skill: 'Tailwind CSS 3/4', count: 395, percentage: 66 },
        { skill: 'Python / FastAPI', count: 310, percentage: 52 },
        { skill: 'GraphQL & REST', count: 280, percentage: 47 },
        { skill: 'PostgreSQL / Supabase', count: 245, percentage: 41 },
        { skill: 'State Management (Zustand/Redux)', count: 210, percentage: 35 },
        { skill: 'CI/CD & Testing (Vitest/Jest)', count: 180, percentage: 30 },
      ],
      startup_vs_mnc: points.map((p, i) => ({
        date: p,
        startup: Math.round(counts[i] * 0.68),
        mnc: Math.round(counts[i] * 0.32),
      })),
      kpis: {
        total_jobs: 1995,
        pct_change: 14.3,
        top_skill: 'React & TypeScript',
        startup_share_pct: 68,
      },
    };
  }

  /**
   * Recommendation Insights for AI Explainability
   */
  static async getRecommendationInsights(): Promise<RecommendationInsight[]> {
    await mockDelay(150);
    return [
      {
        job_id: 'job-01',
        title: 'Senior Frontend Engineer',
        company: 'Stripe',
        match_percentage: 94,
        reasons: [
          'High skill overlap in React, TypeScript, and Design Systems',
          'Preferred remote work model aligns with your profile settings',
          'Competitive compensation matching your target salary range',
        ],
      },
      {
        job_id: 'job-02',
        title: 'Full Stack Next.js Architect',
        company: 'Vercel',
        match_percentage: 89,
        reasons: [
          'Strong match on Next.js App Router and Server Components',
          'Company is actively expanding their developer platform team',
        ],
      },
      {
        job_id: 'job-03',
        title: 'Developer Experience Engineer',
        company: 'Supabase',
        match_percentage: 91,
        reasons: [
          'Matches open-source tooling and API documentation portfolio',
          'Early applicant window open (<10 applicants currently applied)',
        ],
      },
    ];
  }

  /**
   * Swipe Behavior and Preferences Summary
   */
  static async getSwipeBehaviorSummary(): Promise<SwipeBehaviorSummary> {
    await mockDelay(150);
    return {
      total_swipes: 48,
      right_swipes: 28,
      left_swipes: 20,
      right_swipe_ratio: 0.58,
      top_industry: 'Developer Tools & SaaS',
      avg_saved_match: 88.5,
    };
  }

  /**
   * Resume Version Performance Comparison
   */
  static async getResumePerformance(): Promise<ResumePerformanceItem[]> {
    await mockDelay(150);
    return [
      {
        resume_id: 'res-v1',
        version_label: 'Version 1 — Frontend Generalist',
        views: 34,
        applies: 12,
        shortlists: 4,
        interviews: 2,
        shortlist_rate: 0.33,
      },
      {
        resume_id: 'res-v2',
        version_label: 'Version 2 — Senior React & TS Specialist',
        views: 58,
        applies: 22,
        shortlists: 11,
        interviews: 6,
        shortlist_rate: 0.50,
      },
    ];
  }

  static async getAdminDashboard(): Promise<AdminDashboardData> {
    if (API_CONFIG.USE_MOCK) {
      return {
        total_users: 154,
        total_job_seekers: 120,
        total_recruiters: 34,
        total_jobs: 42,
        active_jobs: 30,
        total_applications: 320,
        pending_items: 5,
        stats: {
          total_users: 154,
          active_jobs: 42,
          total_applications: 320,
          avg_time_to_hire_days: 14,
        },
      };
    }
    return httpRequest<AdminDashboardData>('/api/v1/analytics/admin');
  }

  static async getAdminUsers(params?: { search?: string; role?: string }): Promise<AdminUserRecord[]> {
    if (API_CONFIG.USE_MOCK) {
      return [
        { id: 'usr-1', name: 'John Doe', email: 'john@example.com', role: 'candidate', created_at: '2026-09-01' },
        { id: 'usr-2', name: 'Jane Smith', email: 'jane@techcorp.com', role: 'recruiter', created_at: '2026-09-05' },
      ];
    }
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    return httpRequest<AdminUserRecord[]>(`/api/v1/admin/users?${query.toString()}`);
  }

  static async getAdminRecruiters(search?: string): Promise<AdminRecruiterRecord[]> {
    if (API_CONFIG.USE_MOCK) {
      return [
        { id: 'rec-1', name: 'Jane Smith', email: 'jane@techcorp.com', company_name: 'Tech Corp', jobs_posted_count: 5 },
      ];
    }
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return httpRequest<AdminRecruiterRecord[]>(`/api/v1/admin/recruiters${query}`);
  }

  static async getAdminJobs(params?: { search?: string; status?: string }): Promise<AdminJobRecord[]> {
    if (API_CONFIG.USE_MOCK) {
      return [
        { id: 'job-1', title: 'Senior Backend Engineer', company: 'Tech Corp', location: 'Remote', status: 'active', applicant_count: 12 },
      ];
    }
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    return httpRequest<AdminJobRecord[]>(`/api/v1/admin/jobs?${query.toString()}`);
  }

  static async getAdminApplications(params?: { search?: string; stage?: string }): Promise<AdminApplicationRecord[]> {
    if (API_CONFIG.USE_MOCK) {
      return [
        { id: 'app-1', job_title: 'Senior Backend Engineer', company_name: 'Tech Corp', candidate_name: 'John Doe', status: 'applied', applied_at: '2026-10-01' },
      ];
    }
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.stage) query.append('stage', params.stage);
    return httpRequest<AdminApplicationRecord[]>(`/api/v1/admin/applications?${query.toString()}`);
  }

  static async getCompanies(params?: { newly_founded?: boolean }): Promise<Company[]> {
    if (API_CONFIG.USE_MOCK) {
      return [
        { id: 'comp-1', company_id: 'comp-1', name: 'Tech Corp', industry: 'Software', is_newly_founded: false, aggregate_rating: 4.8, reviews_count: 85 },
        { id: 'comp-2', company_id: 'comp-2', name: 'AI Labs Startup', industry: 'Artificial Intelligence', is_newly_founded: true, aggregate_rating: 4.9, reviews_count: 24 },
      ];
    }
    const query = params?.newly_founded ? '?newly_founded=true' : '';
    return httpRequest<Company[]>(`/api/v1/companies${query}`);
  }

  static async getCompanyById(companyId: string): Promise<CompanyDetail> {
    if (API_CONFIG.USE_MOCK) {
      return {
        id: companyId,
        company_id: companyId,
        name: 'Tech Corp',
        industry: 'Software',
        size: '100-500',
        about: 'Leading technology solutions company building scalable cloud architectures.',
        is_newly_founded: false,
        aggregate_rating: 4.8,
        reviews_count: 85,
        active_jobs: [],
      };
    }
    return httpRequest<CompanyDetail>(`/api/v1/companies/${companyId}`);
  }
}

/**
 * ProfileApiService — Handles user profile fetch, partial updates, and avatar uploads.
 */
export class ProfileApiService {

  static async getProfile(): Promise<UserProfile> {
    if (!API_CONFIG.USE_MOCK) {
      return httpRequest<UserProfile>(API_ENDPOINTS.PROFILE.ME);
    }

    // Mock Mode
    await mockDelay(200);
    const storedUserRaw = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER);
    let user: User = INITIAL_USER;
    if (storedUserRaw) {
      try {
        user = JSON.parse(storedUserRaw);
      } catch {
        user = INITIAL_USER;
      }
    }

    return {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '+1 (555) 014-3829',
      location: user.location || 'San Francisco, CA (Hybrid)',
      bio: user.bio || 'Senior Product Designer specializing in design systems, data visualization, and developer toolkits with 6+ years of tech experience.',
      profile_picture_url: user.avatar || user.profile_picture_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      skills: user.skills || ['Figma', 'UX/UI', 'Design Systems', 'Prototyping', 'React', 'TypeScript'],
      experience_years: user.experience_years ?? 6,
      resume_url: user.resume_url,
      current_title: user.current_title || user.title || 'Senior Product Designer',
      expected_salary: user.expected_salary ?? 165000,
      job_type_preference: user.job_type_preference || 'Hybrid',
      company_name: user.company_name || 'Nexus Technologies',
      company_website: user.company_website || 'https://nexustech.io',
      designation: user.designation || 'Principal Talent Partner',
    };
  }

  static async updateProfile(data: UserProfileUpdate): Promise<UserProfile> {
    if (!API_CONFIG.USE_MOCK) {
      return httpRequest<UserProfile>(API_ENDPOINTS.PROFILE.UPDATE, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }

    // Mock Mode
    await mockDelay(350);
    const current = await this.getProfile();
    const updated: UserProfile = {
      ...current,
      ...data,
      name: data.name ?? current.name,
      skills: data.skills ?? current.skills,
    };

    // Update localStorage user so auth state syncs
    const userToSave: User = {
      user_id: updated.user_id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      avatar: updated.profile_picture_url || current.profile_picture_url,
      profile_picture_url: updated.profile_picture_url || current.profile_picture_url,
      title: updated.current_title || updated.designation,
      skills: updated.skills,
      phone: updated.phone,
      location: updated.location,
      bio: updated.bio,
      experience_years: updated.experience_years,
      current_title: updated.current_title,
      expected_salary: updated.expected_salary,
      job_type_preference: updated.job_type_preference,
      company_name: updated.company_name,
      company_website: updated.company_website,
      designation: updated.designation,
    };
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(userToSave));

    return updated;
  }

  static async uploadProfilePicture(file: File): Promise<{ profile_picture_url: string }> {
    if (!API_CONFIG.USE_MOCK) {
      const formData = new FormData();
      formData.append('file', file);
      return httpRequest<{ profile_picture_url: string }>(API_ENDPOINTS.PROFILE.UPLOAD_PICTURE, {
        method: 'POST',
        body: formData,
      });
    }

    // Mock Mode: Convert File to Object URL / Base64 Data URL
    await mockDelay(400);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Save to current user avatar
        const stored = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER);
        if (stored) {
          try {
            const user = JSON.parse(stored);
            user.avatar = dataUrl;
            user.profile_picture_url = dataUrl;
            localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
          } catch {}
        }
        resolve({ profile_picture_url: dataUrl });
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }
}

/**
 * RecruiterApiService — Handles job posting CRUD, candidate pipeline fetching, and stage updates.
 */
export class RecruiterApiService {

  private static getInitialMockApplicants(jobId: string | number): Applicant[] {
    return [
      {
        application_id: `app_${jobId}_01`,
        job_id: jobId,
        candidate_id: 'usr_c101',
        candidate: {
          user_id: 'usr_c101',
          name: 'Sophia Chen',
          email: 'sophia.chen@craftui.io',
          phone: '+1 (555) 234-8901',
          location: 'San Francisco, CA (Hybrid)',
          bio: 'Design Systems Architect with 7+ years creating multi-brand UI component libraries, token systems, and rapid prototyping workflows.',
          profile_picture_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          skills: ['Figma', 'Design Systems', 'React', 'TypeScript', 'Tokens Studio', 'Enterprise UX'],
          resume_url: '/resumes/sophia-chen-resume.pdf',
          current_title: 'Lead Product Designer',
          experience_years: 7,
          expected_salary: 175000,
        },
        stage: 'Shortlisted',
        match_score: 95,
        applied_at: '2 hours ago',
        notes: 'Exceptional portfolio presentation. Strong experience in Figma design tokens and design systems.',
      },
      {
        application_id: `app_${jobId}_02`,
        job_id: jobId,
        candidate_id: 'usr_c102',
        candidate: {
          user_id: 'usr_c102',
          name: 'Marcus Vance',
          email: 'marcus.v@devcraft.com',
          phone: '+1 (555) 345-9012',
          location: 'New York, NY (On-site)',
          bio: 'Frontend engineer turned interface craftsman. Focused on web performance, accessible interaction models, and Next.js micro-frontends.',
          profile_picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
          skills: ['React', 'Next.js', 'Tailwind CSS', 'TypeScript', 'Web Audio API', 'WCAG AAA'],
          resume_url: '/resumes/marcus-vance-resume.pdf',
          current_title: 'Senior Frontend Engineer',
          experience_years: 5,
          expected_salary: 165000,
        },
        stage: 'Interviewing',
        match_score: 91,
        applied_at: '1 day ago',
        notes: 'Technical round scheduled for Thursday 2:00 PM EST.',
      },
      {
        application_id: `app_${jobId}_03`,
        job_id: jobId,
        candidate_id: 'usr_c103',
        candidate: {
          user_id: 'usr_c103',
          name: 'Elena Rostova',
          email: 'elena.rostova@techfront.org',
          phone: '+1 (555) 456-0123',
          location: 'Austin, TX (Remote)',
          bio: 'Passionate UI engineer specialized in data-heavy enterprise dashboards and interactive vector charts.',
          profile_picture_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
          skills: ['Figma', 'Prototyping', 'User Research', 'React', 'D3.js', 'Enterprise UX'],
          resume_url: '/resumes/elena-rostova-resume.pdf',
          current_title: 'Senior UX Designer',
          experience_years: 6,
          expected_salary: 160000,
        },
        stage: 'New',
        match_score: 88,
        applied_at: '3 hours ago',
        notes: 'Swiped right from discovery deck. High skill alignment with design tools.',
      },
      {
        application_id: `app_${jobId}_04`,
        job_id: jobId,
        candidate_id: 'usr_c104',
        candidate: {
          user_id: 'usr_c104',
          name: 'Liam Gallagher',
          email: 'liam.g@cloudpulse.io',
          phone: '+1 (555) 567-1234',
          location: 'Seattle, WA (Remote)',
          bio: 'Staff Product Designer with a track record of scaling consumer fintech apps to 10M+ MAU with high NPS.',
          profile_picture_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
          skills: ['Fintech UX', 'Design Systems', 'Figma', 'User Research', 'Rapid Prototyping'],
          resume_url: '/resumes/liam-gallagher-resume.pdf',
          current_title: 'Staff Product Designer',
          experience_years: 9,
          expected_salary: 195000,
        },
        stage: 'Offered',
        match_score: 96,
        applied_at: '4 days ago',
        notes: 'Offer package sent: $190,000 base + 0.15% equity. Awaiting sign-off.',
      },
      {
        application_id: `app_${jobId}_05`,
        job_id: jobId,
        candidate_id: 'usr_c105',
        candidate: {
          user_id: 'usr_c105',
          name: 'Maya Patel',
          email: 'maya.patel@horizondev.com',
          phone: '+1 (555) 678-2345',
          location: 'Chicago, IL (Hybrid)',
          bio: 'Junior to Mid frontend developer exploring modern component libraries and web styling patterns.',
          profile_picture_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
          skills: ['HTML', 'CSS', 'JavaScript', 'Bootstrap', 'React Basics'],
          resume_url: '/resumes/maya-patel-resume.pdf',
          current_title: 'Frontend Developer',
          experience_years: 2,
          expected_salary: 105000,
        },
        stage: 'Rejected',
        match_score: 68,
        applied_at: '5 days ago',
        notes: 'Insufficient senior-level architecture experience for current lead opening.',
      },
      {
        application_id: `app_${jobId}_06`,
        job_id: jobId,
        candidate_id: 'usr_c106',
        candidate: {
          user_id: 'usr_c106',
          name: 'David Kim',
          email: 'david.kim@apexsystems.dev',
          phone: '+1 (555) 789-3456',
          location: 'San Jose, CA (Hybrid)',
          bio: 'Principal UI/UX Specialist with deep experience in mobile native interfaces, micro-interactions, and accessibility.',
          profile_picture_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
          skills: ['Figma', 'Mobile UX', 'Micro-interactions', 'Design Tokens', 'Storybook'],
          resume_url: '/resumes/david-kim-resume.pdf',
          current_title: 'Principal UI Designer',
          experience_years: 8,
          expected_salary: 185000,
        },
        stage: 'New',
        match_score: 93,
        applied_at: 'Just now',
        notes: 'New swipe-in! High affinity for enterprise design system roles.',
      }
    ];
  }

  static async getPostedJobs(): Promise<RecruiterJob[]> {
    if (!API_CONFIG.USE_MOCK) {
      return httpRequest<RecruiterJob[]>(API_ENDPOINTS.RECRUITER.JOBS, { method: 'GET' });
    }

    // Mock Mode
    await mockDelay(200);
    const stored = localStorage.getItem(API_CONFIG.STORAGE_KEYS.RECRUITER_JOBS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {}
    }

    // Seed initial recruiter jobs from MOCK_JOBS
    const seeded: RecruiterJob[] = MOCK_JOBS.slice(0, 5).map((job, idx) => ({
      ...job,
      status: idx === 3 ? 'draft' : idx === 4 ? 'closed' : 'active',
      applicant_count: idx === 0 ? 6 : idx === 1 ? 8 : idx === 2 ? 4 : 2,
    }));

    localStorage.setItem(API_CONFIG.STORAGE_KEYS.RECRUITER_JOBS, JSON.stringify(seeded));
    return seeded;
  }

  static async createJob(payload: CreateJobInput): Promise<RecruiterJob> {
    if (!API_CONFIG.USE_MOCK) {
      return httpRequest<RecruiterJob>(API_ENDPOINTS.RECRUITER.JOBS, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    // Mock Mode
    await mockDelay(350);
    const existing = await this.getPostedJobs();
    const newId = `job_${Date.now().toString(36)}`;
    const salaryRange = payload.salary_range || 
      (payload.salary_min && payload.salary_max 
        ? `$${Math.round(payload.salary_min / 1000)}k-$${Math.round(payload.salary_max / 1000)}k`
        : '$140k-$180k');

    const newJob: RecruiterJob = {
      job_id: newId,
      title: payload.title,
      company: payload.company,
      location: payload.location,
      salary_range: salaryRange,
      salary_min: payload.salary_min,
      salary_max: payload.salary_max,
      work_environment: payload.work_environment || 'Hybrid',
      industry: payload.industry || 'Technology',
      job_type: payload.job_type || 'Full-time',
      description: payload.description || '',
      skills: payload.skills || [],
      skills_required: payload.skills || [],
      status: payload.status || 'active',
      primary_tools: (payload.skills || []).slice(0, 3),
      posted_at: new Date().toISOString(),
      applicant_count: 0,
      match_score: 90,
    };

    const updated = [newJob, ...existing];
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.RECRUITER_JOBS, JSON.stringify(updated));
    return newJob;
  }

  static async updateJobStatus(jobId: string | number, status: JobStatus): Promise<RecruiterJob> {
    if (!API_CONFIG.USE_MOCK) {
      return httpRequest<RecruiterJob>(API_ENDPOINTS.RECRUITER.JOB_STATUS(jobId), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    }

    // Mock Mode
    await mockDelay(200);
    const jobs = await this.getPostedJobs();
    const index = jobs.findIndex(j => String(j.job_id) === String(jobId));
    if (index === -1) {
      throw new ApiError(`Job ${jobId} not found`, 404);
    }

    jobs[index].status = status;
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.RECRUITER_JOBS, JSON.stringify(jobs));
    return jobs[index];
  }

  static async getApplicants(jobId: string | number): Promise<Applicant[]> {
    if (!API_CONFIG.USE_MOCK) {
      return httpRequest<Applicant[]>(API_ENDPOINTS.RECRUITER.APPLICANTS(jobId), {
        method: 'GET',
      });
    }

    // Mock Mode
    await mockDelay(250);
    const storedRaw = localStorage.getItem(API_CONFIG.STORAGE_KEYS.RECRUITER_APPLICANTS);
    let allApplicants: Record<string, Applicant[]> = {};
    if (storedRaw) {
      try {
        allApplicants = JSON.parse(storedRaw);
      } catch {}
    }

    const key = String(jobId);
    if (!allApplicants[key] || allApplicants[key].length === 0) {
      allApplicants[key] = this.getInitialMockApplicants(jobId);
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.RECRUITER_APPLICANTS, JSON.stringify(allApplicants));
    }

    return allApplicants[key];
  }

  static async updateApplicantStage(
    applicationId: string,
    stage: PipelineStage,
    notes?: string
  ): Promise<Applicant> {
    if (!API_CONFIG.USE_MOCK) {
      return httpRequest<Applicant>(API_ENDPOINTS.RECRUITER.APPLICANT_STAGE(applicationId), {
        method: 'PATCH',
        body: JSON.stringify({ stage, notes }),
      });
    }

    // Mock Mode
    await mockDelay(200);
    const storedRaw = localStorage.getItem(API_CONFIG.STORAGE_KEYS.RECRUITER_APPLICANTS);
    let allApplicants: Record<string, Applicant[]> = {};
    if (storedRaw) {
      try {
        allApplicants = JSON.parse(storedRaw);
      } catch {}
    }

    let foundApplicant: Applicant | null = null;
    for (const jId of Object.keys(allApplicants)) {
      const list = allApplicants[jId];
      const idx = list.findIndex(a => a.application_id === applicationId);
      if (idx !== -1) {
        list[idx].stage = stage;
        if (notes !== undefined) {
          list[idx].notes = notes;
        }
        list[idx].updated_at = new Date().toISOString();
        foundApplicant = list[idx];
        break;
      }
    }

    if (!foundApplicant) {
      throw new ApiError(`Applicant ${applicationId} not found`, 404);
    }

    localStorage.setItem(API_CONFIG.STORAGE_KEYS.RECRUITER_APPLICANTS, JSON.stringify(allApplicants));
    return foundApplicant;
  }

  static async getAnalytics(): Promise<RecruiterAnalyticsData> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const raw = await httpRequest<any>(API_ENDPOINTS.RECRUITER.ANALYTICS, {
          method: 'GET',
        });
        return ApiAdapter.toRecruiterAnalytics(raw);
      } catch (err) {
        console.warn('Backend recruiter analytics failed, falling back to mock metrics:', err);
      }
    }

    // Mock Mode
    await mockDelay(150);
    const jobs = await this.getPostedJobs();
    const storedRaw = localStorage.getItem(API_CONFIG.STORAGE_KEYS.RECRUITER_APPLICANTS);
    let allApplicants: Record<string, Applicant[]> = {};
    if (storedRaw) {
      try {
        allApplicants = JSON.parse(storedRaw);
      } catch {}
    }

    const stageCounts: Record<PipelineStage, number> = {
      New: 0,
      Shortlisted: 0,
      Interviewing: 0,
      Offered: 0,
      Rejected: 0,
    };

    let totalApplicants = 0;
    Object.values(allApplicants).forEach(list => {
      list.forEach(app => {
        totalApplicants++;
        if (stageCounts[app.stage] !== undefined) {
          stageCounts[app.stage]++;
        }
      });
    });

    // If no applicants stored yet, provide baseline counts
    if (totalApplicants === 0) {
      stageCounts.New = 6;
      stageCounts.Shortlisted = 5;
      stageCounts.Interviewing = 3;
      stageCounts.Offered = 2;
      stageCounts.Rejected = 2;
      totalApplicants = 18;
    }

    return {
      total_jobs: jobs.length,
      active_jobs: jobs.filter(j => j.status === 'active').length,
      closed_jobs: jobs.filter(j => j.status === 'closed').length,
      draft_jobs: jobs.filter(j => j.status === 'draft').length,
      total_applicants: totalApplicants,
      stage_counts: stageCounts,
      avg_time_to_hire_days: 18,
    };
  }
}




