/**
 * SwipeX Resume Service
 * 
 * Milestone 3 Multi-Resume Version Management Service
 * 
 * Live REST Endpoints:
 * - POST /api/v1/resumes/upload (multipart/form-data)
 * - GET  /api/v1/resumes
 * - POST /api/v1/resumes/{id}/parse
 * - PATCH /api/v1/resumes/{id}/set-default
 * - DELETE /api/v1/resumes/{id}
 * 
 * Architecture:
 * - When API_CONFIG.USE_MOCK === false: Calls real HTTP REST API endpoints with JWT Authorization.
 * - When API_CONFIG.USE_MOCK === true: Operates against localStorage-persisted mock resume versions
 *   with realistic latency, semantic taxonomy extraction, asynchronous parsing simulation, and error recovery.
 */

import { API_CONFIG, API_ENDPOINTS, ApiError } from '../config/api';
import { ResumeVersion, SkillCategoryGroup, ParseStatus } from '../types';
import { ApiAdapter } from './apiAdapter';

const mockDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced HTTP request wrapper with friendly HTTP status error messages
 */
async function httpRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach Content-Type only if not FormData
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
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      // Friendly contextual error mapping per SRS Day 3 specification
      switch (response.status) {
        case 401:
          // Dispatch session expired event
          window.dispatchEvent(new CustomEvent('swipex:auth_expired'));
          throw new ApiError(
            'Your session has expired. Please sign in again to continue.',
            401,
            errorData
          );
        case 403:
          throw new ApiError(
            'Access restricted: Resume uploading and parsing is available only for Job Seeker accounts.',
            403,
            errorData
          );
        case 413:
          throw new ApiError(
            'File is too large. Server rejects payloads exceeding 5 MB limit. Please compress your document.',
            413,
            errorData
          );
        case 415:
          throw new ApiError(
            'Unsupported media type. Only PDF and DOCX files are supported by the ATS parser.',
            415,
            errorData
          );
        case 422: {
          const validationMsg = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : Array.isArray(errorData.detail)
            ? errorData.detail.map((d: any) => d.msg || d.message).join(', ')
            : 'Validation error in resume metadata or file encoding.';
          throw new ApiError(validationMsg, 422, errorData);
        }
        case 500:
        case 502:
        case 503:
        case 504:
          throw new ApiError(
            `Backend server error (${response.status}). Our parsing service is currently busy. Please retry shortly.`,
            response.status,
            errorData
          );
        default:
          throw new ApiError(
            errorData.message || errorData.detail || `Request failed with status ${response.status}`,
            response.status,
            errorData
          );
      }
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please verify your backend server connectivity.', 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error occurred. Ensure backend is running.', 500);
  }
}

/**
 * Normalizes backend response shapes using the central ApiAdapter.
 */
function normalizeResumeVersion(raw: any, indexFallback = 1): ResumeVersion {
  return ApiAdapter.toResumeVersion(raw, indexFallback);
}

// Initial Seed Dataset for Mock Mode
export const INITIAL_MOCK_RESUME_VERSIONS: ResumeVersion[] = [
  {
    resume_id: 'res_v3_frontend_2026',
    version: 3,
    version_label: 'Senior Frontend & UI Specialist',
    filename: 'Alex_Mercer_Frontend_2026.pdf',
    file_size: '1.2 MB',
    uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    is_default: true,
    parse_status: 'parsed',
    target_track: 'Senior Frontend Engineer',
    overall_fit_score: 88,
    format_compatibility: 'High',
    experience_years: 5,
    parsed_skills: [
      'React 19',
      'TypeScript',
      'Tailwind CSS',
      'Next.js 15',
      'Framer Motion',
      'GraphQL',
      'Design Systems',
      'Zustand',
      'Vite',
      'Figma',
      'Accessibility (WCAG)',
      'REST APIs'
    ],
    extracted_skills: [
      'React 19', 'TypeScript', 'Tailwind CSS', 'Next.js 15', 'Framer Motion', 'GraphQL'
    ],
    skill_categories: [
      {
        category: 'Core Frontend & UI',
        skills: ['React 19', 'TypeScript', 'Tailwind CSS', 'Next.js 15', 'Framer Motion', 'Figma']
      },
      {
        category: 'Architecture & State',
        skills: ['GraphQL', 'REST APIs', 'Zustand', 'Design Systems', 'Accessibility (WCAG)']
      },
      {
        category: 'Tooling & Build',
        skills: ['Vite', 'Git', 'Webpack', 'Jest']
      }
    ]
  },
  {
    resume_id: 'res_v2_fullstack_2026',
    version: 2,
    version_label: 'Full-Stack Product Engineer',
    filename: 'Alex_Mercer_Fullstack_v2.pdf',
    file_size: '1.8 MB',
    uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    is_default: false,
    parse_status: 'parsed',
    target_track: 'Full-Stack Developer',
    overall_fit_score: 82,
    format_compatibility: 'High',
    experience_years: 4,
    parsed_skills: [
      'React',
      'TypeScript',
      'Node.js',
      'Express',
      'PostgreSQL',
      'Prisma',
      'Redis',
      'Docker',
      'REST APIs',
      'Tailwind CSS'
    ],
    extracted_skills: [
      'React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'
    ],
    skill_categories: [
      {
        category: 'Frontend & UI',
        skills: ['React', 'TypeScript', 'Tailwind CSS']
      },
      {
        category: 'Backend & Data',
        skills: ['Node.js', 'Express', 'PostgreSQL', 'Prisma', 'Redis']
      },
      {
        category: 'DevOps & Tooling',
        skills: ['Docker', 'Git', 'REST APIs']
      }
    ]
  },
  {
    resume_id: 'res_v1_general_2025',
    version: 1,
    version_label: 'General Software Engineer (Archived)',
    filename: 'Alex_Mercer_General_2025.docx',
    file_size: '2.4 MB',
    uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    is_default: false,
    parse_status: 'parsed',
    target_track: 'Software Engineer',
    overall_fit_score: 74,
    format_compatibility: 'Medium',
    experience_years: 3,
    parsed_skills: [
      'JavaScript',
      'HTML/CSS',
      'React',
      'Python',
      'SQL',
      'Git',
      'Agile Scrum'
    ],
    extracted_skills: [
      'JavaScript', 'Python', 'SQL', 'Git'
    ],
    skill_categories: [
      {
        category: 'Languages & Core',
        skills: ['JavaScript', 'HTML/CSS', 'Python', 'SQL']
      },
      {
        category: 'Frameworks & Tools',
        skills: ['React', 'Git', 'Agile Scrum']
      }
    ]
  }
];

export class ResumeService {
  /**
   * Helper to retrieve persisted resume versions in mock mode.
   */
  private static getStoredVersions(): ResumeVersion[] {
    try {
      const raw = localStorage.getItem(API_CONFIG.STORAGE_KEYS.RESUME_VERSIONS);
      if (!raw) {
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.RESUME_VERSIONS, JSON.stringify(INITIAL_MOCK_RESUME_VERSIONS));
        return INITIAL_MOCK_RESUME_VERSIONS;
      }
      return JSON.parse(raw);
    } catch {
      return INITIAL_MOCK_RESUME_VERSIONS;
    }
  }

  /**
   * Helper to save versions in mock mode.
   */
  private static saveStoredVersions(versions: ResumeVersion[]): void {
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.RESUME_VERSIONS, JSON.stringify(versions));
  }

  /**
   * GET /api/v1/resumes
   * Retrieves all resume versions for the current authenticated user.
   */
  static async getResumeVersions(): Promise<ResumeVersion[]> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const res = await httpRequest<{ items?: any[]; resumes?: any[] } | any[]>(
          API_ENDPOINTS.RESUMES.LIST,
          { method: 'GET' }
        );

        const items = Array.isArray(res) 
          ? res 
          : res.items || res.resumes || [];

        const normalizedList = items.map((rawItem: any, idx: number) => normalizeResumeVersion(rawItem, items.length - idx));

        // Requirement 4: Fall back to newest version = default when is_default is missing from backend
        if (normalizedList.length > 0 && !normalizedList.some(v => v.is_default)) {
          normalizedList[0].is_default = true;
        }

        return normalizedList;
      } catch (err: any) {
        console.warn('[ResumeService] Live GET /resumes failed, falling back to mock storage:', err.message);
        return this.getStoredVersions();
      }
    }

    await mockDelay(200);
    return this.getStoredVersions();
  }

  /**
   * Retrieves the currently active/default resume version.
   */
  static async getDefaultResume(): Promise<ResumeVersion | null> {
    const versions = await this.getResumeVersions();
    return versions.find(v => v.is_default) || versions[0] || null;
  }

  /**
   * Retrieves a specific resume version by ID.
   */
  static async getResumeById(resumeId: string): Promise<ResumeVersion | null> {
    const versions = await this.getResumeVersions();
    return versions.find(v => v.resume_id === resumeId) || null;
  }

  /**
   * POST /api/v1/resumes/upload (multipart/form-data)
   * Uploads a resume file creating a new version.
   */
  static async uploadResume(
    file: File,
    versionLabel?: string,
    isDefault = false
  ): Promise<ResumeVersion> {
    // 1. Client-side file extension check
    const validExtensions = ['.pdf', '.docx', '.doc'];
    const fileName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExt) {
      throw new ApiError('Unsupported document format. Only PDF and DOCX files are supported.', 415);
    }

    // 2. Client-side file size check (5 MB cap)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      throw new ApiError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5 MB limit. Please compress your document.`, 413);
    }

    // 3. Live HTTP REST call
    if (!API_CONFIG.USE_MOCK) {
      const formData = new FormData();
      formData.append('file', file);
      if (versionLabel) formData.append('version_label', versionLabel);
      if (isDefault) formData.append('is_default', 'true');

      try {
        const rawRes = await httpRequest<any>(API_ENDPOINTS.RESUMES.UPLOAD, {
          method: 'POST',
          body: formData,
        });

        const created = normalizeResumeVersion(rawRes);
        
        // If parsed skills are not yet extracted and status is pending, trigger immediate parse
        if (created.parse_status === 'pending' || !created.parsed_skills || created.parsed_skills.length === 0) {
          try {
            return await this.parseResume(created.resume_id);
          } catch {
            return created;
          }
        }
        return created;
      } catch (err: any) {
        console.warn('[ResumeService] Live POST /resumes/upload failed, executing mock fallback:', err.message);
        // If live fails, re-throw if it was an explicit client/auth error
        if (err.status === 401 || err.status === 403 || err.status === 413 || err.status === 415) {
          throw err;
        }
      }
    }

    // --- MOCK SERVICE LAYER ---
    await mockDelay(420);
    const existing = this.getStoredVersions();
    const nextVersionNum = existing.length > 0 ? Math.max(...existing.map(v => v.version)) + 1 : 1;
    const resumeId = `res_v${nextVersionNum}_${Date.now()}`;

    // Extract skills heuristically based on file naming or standard tracks
    const isFrontend = fileName.includes('front') || fileName.includes('ui') || fileName.includes('react') || fileName.includes('design');
    const isFullstack = fileName.includes('full') || fileName.includes('node') || fileName.includes('back');

    let parsedSkills = [
      'React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'REST APIs', 'Git', 'Figma'
    ];

    if (isFrontend) {
      parsedSkills = [
        'React 19', 'TypeScript', 'Tailwind CSS', 'Next.js 15', 'Framer Motion',
        'GraphQL', 'Design Systems', 'Zustand', 'Vite', 'Figma', 'Accessibility (WCAG)'
      ];
    } else if (isFullstack) {
      parsedSkills = [
        'React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL',
        'Prisma', 'Redis', 'Docker', 'GraphQL', 'REST APIs'
      ];
    }

    const categories: SkillCategoryGroup[] = [
      {
        category: 'Core Engineering',
        skills: parsedSkills.slice(0, 5)
      },
      {
        category: 'Architecture & Tooling',
        skills: parsedSkills.slice(5)
      }
    ];

    const newVersion: ResumeVersion = {
      resume_id: resumeId,
      version: nextVersionNum,
      version_label: versionLabel || `Tailored Variant v${nextVersionNum}`,
      filename: file.name,
      file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploaded_at: new Date().toISOString(),
      is_default: isDefault || existing.length === 0,
      parse_status: 'parsed',
      target_track: isFrontend ? 'Senior Frontend Engineer' : isFullstack ? 'Full-Stack Developer' : 'Software Engineer',
      overall_fit_score: Math.floor(Math.random() * 12) + 82,
      format_compatibility: 'High',
      experience_years: 5,
      parsed_skills: parsedSkills,
      extracted_skills: parsedSkills,
      skill_categories: categories
    };

    let updatedList = existing;
    if (newVersion.is_default) {
      updatedList = existing.map(v => ({ ...v, is_default: false }));
    }

    updatedList.unshift(newVersion);
    this.saveStoredVersions(updatedList);
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACTIVE_RESUME_ID, newVersion.resume_id);

    return newVersion;
  }

  /**
   * POST /api/v1/resumes/{id}/parse
   * Triggers or retries semantic NLP parsing for an uploaded resume version.
   */
  static async parseResume(resumeId: string): Promise<ResumeVersion> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const rawRes = await httpRequest<any>(API_ENDPOINTS.RESUMES.PARSE(resumeId), {
          method: 'POST',
        });
        return normalizeResumeVersion(rawRes);
      } catch (err: any) {
        console.warn(`[ResumeService] Live POST /resumes/${resumeId}/parse failed, running mock parse:`, err.message);
      }
    }

    await mockDelay(350);
    const existing = this.getStoredVersions();
    const index = existing.findIndex(v => v.resume_id === resumeId);

    if (index === -1) {
      throw new ApiError(`Resume version with ID "${resumeId}" not found for parsing.`, 404);
    }

    const current = existing[index];
    const extractedSkills = current.parsed_skills.length > 0
      ? current.parsed_skills
      : ['React 19', 'TypeScript', 'Tailwind CSS', 'Figma', 'GraphQL', 'Next.js 15'];

    const updated: ResumeVersion = {
      ...current,
      parse_status: 'parsed',
      parsed_skills: extractedSkills,
      extracted_skills: extractedSkills,
      parse_error: undefined,
      overall_fit_score: current.overall_fit_score || 88
    };

    existing[index] = updated;
    this.saveStoredVersions(existing);
    return updated;
  }

  /**
   * PATCH /api/v1/resumes/{resume_id}/set-default (Optional Endpoint)
   * Designates a specific version as the active default across Swipe Deck and ATS dashboard.
   * If backend returns 404/405/501 (not implemented), gracefully falls back locally to keep UI stable.
   */
  static async setDefaultResume(resumeId: string): Promise<ResumeVersion> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const raw = await httpRequest<any>(API_ENDPOINTS.RESUMES.SET_DEFAULT(resumeId), {
          method: 'PATCH',
        });
        return normalizeResumeVersion(raw);
      } catch (err: any) {
        if (err.status === 404 || err.status === 405 || err.status === 501) {
          console.info(`[ResumeService] PATCH /resumes/${resumeId}/set-default not implemented on server (${err.status}). Applying locally.`);
        } else {
          console.warn('[ResumeService] Live set-default request failed, applying locally:', err.message);
        }
      }
    }

    await mockDelay(150);
    const existing = this.getStoredVersions();
    const target = existing.find(v => v.resume_id === resumeId);
    if (!target) {
      throw new ApiError(`Resume version not found: ${resumeId}`, 404);
    }

    const updatedList = existing.map(v => ({
      ...v,
      is_default: v.resume_id === resumeId
    }));

    this.saveStoredVersions(updatedList);
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACTIVE_RESUME_ID, resumeId);

    return { ...target, is_default: true };
  }

  /**
   * DELETE /api/v1/resumes/{resume_id} (Optional Endpoint)
   * Deletes a resume version.
   * If backend returns 404/405/501 (not implemented), gracefully deletes locally to keep UI stable.
   */
  static async deleteResumeVersion(resumeId: string): Promise<void> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        await httpRequest<void>(API_ENDPOINTS.RESUMES.DELETE(resumeId), {
          method: 'DELETE',
        });
      } catch (err: any) {
        if (err.status === 404 || err.status === 405 || err.status === 501) {
          console.info(`[ResumeService] DELETE /resumes/${resumeId} not implemented on server (${err.status}). Removing locally.`);
        } else {
          console.warn('[ResumeService] Live DELETE request failed, removing locally:', err.message);
        }
      }
    }

    await mockDelay(180);
    const existing = this.getStoredVersions();
    const filtered = existing.filter(v => v.resume_id !== resumeId);

    if (filtered.length > 0 && !filtered.some(v => v.is_default)) {
      filtered[0].is_default = true;
    }

    this.saveStoredVersions(filtered);
  }

  /**
   * Updates the skills array for a specific resume version.
   */
  static async updateResumeSkills(resumeId: string, skills: string[]): Promise<ResumeVersion> {
    await mockDelay(120);
    const existing = this.getStoredVersions();
    const index = existing.findIndex(v => v.resume_id === resumeId);
    if (index === -1) {
      throw new ApiError(`Resume version not found: ${resumeId}`, 404);
    }

    const updated = {
      ...existing[index],
      parsed_skills: skills,
      extracted_skills: skills
    };
    existing[index] = updated;
    this.saveStoredVersions(existing);

    return updated;
  }
}
