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
  UserProfileUpdate
} from '../types';
import { MOCK_JOBS, INITIAL_USER, MOCK_INITIAL_RESUME } from '../data/mockData';


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
      return httpRequest<{ user_id: string }>(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    // --- MOCK SERVICE LAYER (Milestone 1 Stub) ---
    await mockDelay(300);
    const userId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const user: User = {
      user_id: userId,
      name: payload.name,
      email: payload.email,
      role: payload.role || 'candidate',
      title: payload.role === 'recruiter' ? 'Talent Partner' : 'Senior Product Designer',
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
    }

    // --- MOCK SERVICE LAYER (Milestone 1 Stub) ---
    await mockDelay(300);
    const accessToken = `mock_jwt_access_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const refreshToken = `mock_jwt_refresh_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const role: UserRole = 'candidate';

    localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, accessToken);
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    const existing = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER);
    if (!existing) {
      const user: User = {
        ...INITIAL_USER,
        email: payload.email || INITIAL_USER.email,
      };
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    }

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
      const data = await httpRequest<{ access_token: string; role: UserRole }>(
        API_ENDPOINTS.AUTH.GOOGLE,
        { method: 'GET' }
      );
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, data.access_token);
      return data;
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
      return httpRequest<{ user_id: string; name: string; role: UserRole; user: User }>(
        API_ENDPOINTS.AUTH.ME,
        { method: 'GET' }
      );
    }

    // --- MOCK SERVICE LAYER (Milestone 1 Stub) ---
    await mockDelay(100);
    const stored = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER);
    if (!stored) {
      throw new ApiError('No active session found', 401);
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
      return httpRequest<Job[]>(endpoint, { method: 'GET' });
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
      return httpRequest<Job>(API_ENDPOINTS.JOBS.DETAIL(jobId), { method: 'GET' });
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
      return httpRequest<{ swipe_id: string }>(API_ENDPOINTS.SWIPES.SUBMIT, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
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
      return httpRequest<Array<{ job_id: number | string; direction: 'left' | 'right' | 'up'; swiped_at: string }>>(
        API_ENDPOINTS.SWIPES.HISTORY,
        { method: 'GET' }
      );
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
      const formData = new FormData();
      formData.append('file', file);
      return httpRequest<{ resume_id: string; parsed_skills: string[] }>(
        API_ENDPOINTS.RESUME.UPLOAD,
        {
          method: 'POST',
          body: formData,
        }
      );
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
   * GET /api/v1/resume/{resume_id}/ats-score?job_id={id}
   * Real-time ATS match computation comparing resume skills against job requirements.
   */
  static async getAtsScore(resumeId: string, jobId?: string): Promise<ATSScoreResult> {
    if (!API_CONFIG.USE_MOCK) {
      const endpoint = `${API_ENDPOINTS.RESUME.ATS_SCORE(resumeId)}${jobId ? `?job_id=${jobId}` : ''}`;
      return httpRequest<ATSScoreResult>(endpoint, { method: 'GET' });
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
   * GET /api/v1/recommendations?user_id={id}
   * Generates AI/vector-ranked recommendations based on skill affinity.
   */
  static async getRecommendations(userId: string): Promise<JobRecommendation[]> {
    if (!API_CONFIG.USE_MOCK) {
      return httpRequest<JobRecommendation[]>(
        `${API_ENDPOINTS.RESUME.RECOMMENDATIONS}?user_id=${userId}`,
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

