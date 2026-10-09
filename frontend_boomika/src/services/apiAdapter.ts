/**
 * SwipeX API Adapter & Data Mapper Layer
 * 
 * Central Source of Truth for API Field Normalization.
 * 
 * Purpose:
 * Isolate ALL backend <-> frontend field name discrepancies and payload variations in THIS SINGLE FILE.
 * UI Components and Application State interact ONLY with canonical frontend models defined in `src/types`.
 * 
 * Handled Endpoints:
 * - /notifications, /notifications/unread-count, /notifications/{id}/read, /notifications/read-all, /notifications/preferences
 * - /applications, /applications/{id}/status, /applications/{id}/history, /jobs/{id}/competition
 * - /analytics/candidate-summary, /analytics/recruiter-summary (/recruiter/analytics), /analytics/admin-summary, /analytics/hiring-trends
 * - /resumes, /resumes/upload, /resumes/{id}/parse, /resumes/{id}/set-default
 * - /ats/score, /ats/suggestions, /jobs/recommendations
 * - WS /ws/notifications
 */

import { 
  ResumeVersion, 
  ParseStatus, 
  ATSScoreDetailResult, 
  MissingSkillItem,
  AISuggestionsResult,
  AISuggestionItem,
  JobRecommendation,
  Notification,
  NotificationType,
  AlertPreferences,
  ApplicationItem,
  ApplicationStatus,
  StatusHistoryEntry,
  CandidateAnalyticsData,
  CandidateFunnelCounts,
  CandidateSkillGapItem,
  CandidateScoreTrendItem,
  CandidateIndustryEngagementItem,
  CandidateActivityDayItem,
  RecruiterAnalyticsData,
  PipelineStage,
  AdminAnalyticsData,
  HiringTrendData,
  ResumePerformanceItem,
  RecommendationInsight,
  SwipeBehaviorSummary
} from '../types';

/**
 * Raw Backend Resume DTO Representation
 */
export interface RawResumeDto {
  id?: string | number;
  resume_id?: string | number;
  version?: number;
  version_number?: number;
  version_label?: string;
  title?: string;
  filename?: string;
  file_name?: string;
  file_size?: string;
  file_size_bytes?: number;
  uploaded_at?: string;
  created_at?: string;
  updated_at?: string;
  is_default?: boolean;
  is_active?: boolean;
  parse_status?: string;
  status?: string;
  parsed_text?: string;
  text_content?: string;
  extracted_skills?: string[];
  parsed_skills?: string[];
  skills?: string[];
  overall_fit_score?: number;
  format_compatibility?: 'High' | 'Medium' | 'Low' | string;
  experience_years?: number;
  target_track?: string;
  parse_error?: string;
  error_message?: string;
  resume_url?: string;
  file_url?: string;
  skill_categories?: Array<{ category: string; skills: string[] }>;
}

/**
 * Raw Backend ATS Score DTO Representation
 */
export interface RawAtsScoreDto {
  match_score?: number;
  score?: number;
  ats_score?: number;
  match_percentage?: number;
  is_interview_ready?: boolean;
  benchmark_threshold?: number;
  missing_keywords?: string[];
  keywords_missing?: string[];
  missing_skills?: Array<string | { skill: string; importance?: 'high' | 'medium' | 'low'; category?: string }>;
  skills_missing?: string[];
  matched_skills?: string[];
  skills_matched?: string[];
  sub_scores?: {
    skills_match?: number;
    experience_fit?: number;
    work_environment_fit?: number;
  };
  generated_by?: string;
  evaluated_at?: string;
  resume_id?: string;
  job_id?: string;
}

/**
 * Raw AI Suggestion DTO Representation
 */
export interface RawAiSuggestionDto {
  id?: string | number;
  section?: string;
  target_company?: string;
  company?: string;
  title?: string;
  current_text?: string;
  original_text?: string;
  recommended_text?: string;
  suggested_text?: string;
  keywords_added?: string[];
  keywords?: string[];
  estimated_score_boost?: number;
  score_boost?: number;
  boost?: number;
  reasoning?: string;
  explanation?: string;
}

/**
 * Raw Job Recommendation DTO Representation
 */
export interface RawJobRecommendationDto {
  job_id?: string | number;
  id?: string | number;
  match_percentage?: number;
  match_score?: number;
  score?: number;
  similarity?: number;
  affinity?: number;
  generated_by?: string;
}

export class ApiAdapter {
  /* ==========================================================================
     1. RESUME NORMALIZATION & MAPPING
     ========================================================================== */

  /**
   * Normalizes any raw backend resume object into the canonical frontend ResumeVersion model.
   */
  static toResumeVersion(raw: RawResumeDto | any, indexFallback = 1): ResumeVersion {
    if (!raw) {
      throw new Error('[ApiAdapter] Cannot normalize null or undefined resume payload');
    }

    // 1. Resolve ID: id vs resume_id
    const id = String(raw.id || raw.resume_id || `res_${Date.now()}`);

    // 2. Resolve Version Number
    const versionNumber = Number(raw.version || raw.version_number || indexFallback);

    // 3. Resolve Filename: filename vs file_name
    const filename = raw.filename || raw.file_name || 'resume_document.pdf';

    // 4. Resolve Upload Timestamp: uploaded_at vs created_at
    const uploadedAt = raw.uploaded_at || raw.created_at || new Date().toISOString();

    // 5. Resolve Default/Active Flag: is_default vs is_active
    const isDefault = Boolean(raw.is_default !== undefined ? raw.is_default : raw.is_active);

    // 6. Resolve Parse Status: parse_status vs status
    const rawStatus = (raw.parse_status || raw.status || '').toLowerCase();
    let parseStatus: ParseStatus;
    if (rawStatus === 'analyzing' || rawStatus === 'pending' || rawStatus === 'processing') {
      parseStatus = 'analyzing';
    } else if (rawStatus === 'failed' || rawStatus === 'error') {
      parseStatus = 'failed';
    } else if (rawStatus === 'pending_upload') {
      parseStatus = 'pending';
    } else {
      parseStatus = 'parsed';
    }

    // 7. Resolve Extracted Skills: extracted_skills vs parsed_skills vs skills
    const rawSkills = raw.extracted_skills || raw.parsed_skills || raw.skills || [];
    const extractedSkills = Array.isArray(rawSkills) 
      ? rawSkills.map(s => typeof s === 'string' ? s.trim() : String(s)) 
      : [];

    // 8. Resolve File Size formatting
    let fileSize = raw.file_size;
    if (!fileSize && raw.file_size_bytes) {
      fileSize = `${(raw.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (!fileSize) {
      fileSize = '1.2 MB';
    }

    // 9. Derive Skill Categories if not provided by backend
    let skillCategories = raw.skill_categories;
    if (!skillCategories || skillCategories.length === 0) {
      skillCategories = [
        {
          category: 'Core Competencies',
          skills: extractedSkills.slice(0, 6)
        },
        {
          category: 'Supporting Tools & Tech',
          skills: extractedSkills.slice(6)
        }
      ].filter(c => c.skills.length > 0);
    }

    return {
      id: id,
      resume_id: id,
      version: versionNumber,
      version_label: raw.version_label || raw.title || `Resume Variant v${versionNumber}`,
      filename: filename,
      file_size: fileSize,
      uploaded_at: uploadedAt,
      is_default: isDefault,
      parse_status: parseStatus,
      parsed_skills: extractedSkills,
      extracted_skills: extractedSkills,
      parsed_text: raw.parsed_text || raw.text_content || undefined,
      skill_categories: skillCategories,
      overall_fit_score: raw.overall_fit_score || 85,
      format_compatibility: raw.format_compatibility === 'Medium' || raw.format_compatibility === 'Low' 
        ? raw.format_compatibility 
        : 'High',
      experience_years: raw.experience_years || 4,
      target_track: raw.target_track || 'Senior Technical Track',
      parse_error: raw.parse_error || raw.error_message || undefined,
      resume_url: raw.resume_url || raw.file_url || undefined,
    };
  }

  /**
   * Adapts resume list response from backend (handles wrapped arrays vs direct arrays)
   */
  static toResumeVersionList(response: any): ResumeVersion[] {
    if (!response) return [];

    let items: any[] = [];
    if (Array.isArray(response)) {
      items = response;
    } else if (Array.isArray(response.items)) {
      items = response.items;
    } else if (Array.isArray(response.resumes)) {
      items = response.resumes;
    } else if (Array.isArray(response.data)) {
      items = response.data;
    }

    return items.map((raw, idx) => this.toResumeVersion(raw, items.length - idx));
  }

  /**
   * Adapts upload response from backend (handling wrapped object or direct item)
   */
  static toUploadResumeResponse(response: any): ResumeVersion {
    const raw = response?.resume || response?.data || response;
    return this.toResumeVersion(raw);
  }

  /* ==========================================================================
     2. ATS SCORE NORMALIZATION & MAPPING
     ========================================================================== */

  /**
   * Normalizes raw ATS Score response into the canonical ATSScoreDetailResult model.
   * Expected contract: { match_score, missing_keywords: string[], missing_skills: string[] }
   */
  static toAtsScoreResult(
    raw: RawAtsScoreDto | any, 
    resumeIdFallback = 'res_active', 
    jobIdFallback = 'job_target'
  ): ATSScoreDetailResult {
    if (!raw) {
      throw new Error('[ApiAdapter] Cannot normalize null or undefined ATS score payload');
    }

    // Extract score and normalize 0-1 range to 0-100 if necessary
    const rawScore = raw.match_score ?? raw.score ?? raw.ats_score ?? raw.match_percentage ?? 84;
    let score = Number(rawScore);
    if (isNaN(score)) score = 84;
    if (score > 0 && score <= 1) {
      score = Math.round(score * 100);
    } else {
      score = Math.round(score);
    }
    score = Math.min(100, Math.max(0, score));

    const benchmarkThreshold = Number(raw.benchmark_threshold ?? 80);
    const isInterviewReady = raw.is_interview_ready !== undefined 
      ? Boolean(raw.is_interview_ready) 
      : score >= benchmarkThreshold;

    // Normalizing missing_keywords
    const rawKeywords = raw.missing_keywords || raw.keywords_missing || [];
    const missingKeywords = Array.isArray(rawKeywords) ? rawKeywords.map(k => String(k)) : [];

    // Normalizing missing_skills (string[] or object[])
    const rawSkills = raw.missing_skills || raw.skills_missing || [];
    const missingSkills: MissingSkillItem[] = Array.isArray(rawSkills)
      ? rawSkills.map((item: any, idx: number) => {
          if (typeof item === 'string') {
            return {
              skill: item,
              importance: idx < 2 ? 'high' : idx < 4 ? 'medium' : 'low',
              category: 'Technical Requirement'
            };
          }
          return {
            skill: item.skill || String(item),
            importance: item.importance || (idx < 2 ? 'high' : idx < 4 ? 'medium' : 'low'),
            category: item.category || 'Technical Requirement'
          };
        })
      : [];

    // Matched skills
    const rawMatched = raw.matched_skills || raw.skills_matched || [];
    const matchedSkills = Array.isArray(rawMatched) ? rawMatched.map(s => String(s)) : [];

    return {
      resume_id: String(raw.resume_id || resumeIdFallback),
      job_id: String(raw.job_id || jobIdFallback),
      match_score: score,
      is_interview_ready: isInterviewReady,
      benchmark_threshold: benchmarkThreshold,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      missing_keywords: missingKeywords,
      sub_scores: raw.sub_scores || {
        skills_match: score,
        experience_fit: Math.min(100, score + 4),
        work_environment_fit: 100,
      },
      generated_by: raw.generated_by || 'SwipeX-Neural-ATS-v4.2',
      evaluated_at: raw.evaluated_at || new Date().toISOString(),
    };
  }

  /* ==========================================================================
     3. AI SUGGESTIONS NORMALIZATION & MAPPING
     ========================================================================== */

  /**
   * Normalizes raw AI Suggestions response into AISuggestionsResult.
   */
  static toAiSuggestionsResult(
    raw: any,
    resumeIdFallback = 'res_active',
    jobIdFallback = 'job_target'
  ): AISuggestionsResult {
    if (!raw) {
      return {
        resume_id: resumeIdFallback,
        job_id: jobIdFallback,
        suggestions: []
      };
    }

    let items: any[] = [];
    if (Array.isArray(raw)) {
      items = raw;
    } else if (Array.isArray(raw.suggestions)) {
      items = raw.suggestions;
    } else if (Array.isArray(raw.items)) {
      items = raw.items;
    } else if (Array.isArray(raw.data)) {
      items = raw.data;
    }

    const suggestions: AISuggestionItem[] = items.map((item: RawAiSuggestionDto | any, idx: number) => {
      const sectionRaw = (item.section || 'Experience').toLowerCase();
      let section: 'Experience' | 'Skills' | 'Summary' | 'Structure';
      if (sectionRaw.includes('skill')) section = 'Skills';
      else if (sectionRaw.includes('summary')) section = 'Summary';
      else if (sectionRaw.includes('struct') || sectionRaw.includes('format')) section = 'Structure';
      else section = 'Experience';

      return {
        id: String(item.id || `sug_${idx + 1}`),
        section,
        target_company: item.target_company || item.company || undefined,
        title: item.title || `Optimization #${idx + 1}`,
        current_text: item.current_text || item.original_text || undefined,
        recommended_text: item.recommended_text || item.suggested_text || String(item),
        keywords_added: item.keywords_added || item.keywords || [],
        estimated_score_boost: Number(item.estimated_score_boost || item.score_boost || item.boost || 4),
        reasoning: item.reasoning || item.explanation || undefined,
      };
    });

    return {
      resume_id: String(raw.resume_id || resumeIdFallback),
      job_id: String(raw.job_id || jobIdFallback),
      suggestions,
    };
  }

  /* ==========================================================================
     4. RECOMMENDATIONS & MATCH BADGE NORMALIZATION
     ========================================================================== */

  /**
   * Normalizes raw Recommendation DTO into JobRecommendation model.
   * Handles 0-1 decimal vs 0-100 integer range normalization.
   */
  static toJobRecommendation(raw: RawJobRecommendationDto | any): JobRecommendation {
    if (!raw) {
      throw new Error('[ApiAdapter] Cannot normalize null recommendation payload');
    }

    const rawId = raw.job_id ?? raw.id ?? 'job_default';
    const rawScore = raw.match_percentage ?? raw.match_score ?? raw.score ?? raw.similarity ?? raw.affinity ?? 80;
    
    let normalizedPercentage = 80;
    if (typeof rawScore === 'number') {
      if (rawScore <= 1 && rawScore > 0) {
        normalizedPercentage = Math.round(rawScore * 100);
      } else {
        normalizedPercentage = Math.round(rawScore);
      }
    }

    return {
      job_id: String(rawId),
      match_percentage: Math.min(100, Math.max(0, normalizedPercentage)),
      generated_by: raw.generated_by || 'SwipeX-Neural-Ranker',
    };
  }

  /**
   * Adapts list of recommendations from backend
   */
  static toJobRecommendationList(response: any): JobRecommendation[] {
    if (!response) return [];

    let items: any[] = [];
    if (Array.isArray(response)) {
      items = response;
    } else if (Array.isArray(response.recommendations)) {
      items = response.recommendations;
    } else if (Array.isArray(response.items)) {
      items = response.items;
    } else if (Array.isArray(response.data)) {
      items = response.data;
    }

    return items.map(item => this.toJobRecommendation(item));
  }

  /* ==========================================================================
     5. NOTIFICATIONS & PREFERENCES NORMALIZATION
     ========================================================================== */

  /**
   * Normalizes raw Notification DTO into Notification model.
   */
  static toNotification(raw: any): Notification {
    if (!raw) {
      throw new Error('[ApiAdapter] Cannot normalize null notification payload');
    }

    const rawId = raw.id ?? raw.notification_id ?? raw._id ?? `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rawType = raw.type ?? raw.category ?? 'instant_job';
    const rawScore = raw.match_percentage ?? raw.match_score;

    let normalizedMatch: number | undefined = undefined;
    if (typeof rawScore === 'number') {
      if (rawScore <= 1 && rawScore > 0) {
        normalizedMatch = Math.round(rawScore * 100);
      } else {
        normalizedMatch = Math.round(rawScore);
      }
    }

    return {
      id: String(rawId),
      type: rawType as NotificationType,
      title: raw.title ?? raw.heading ?? 'Notification',
      message: raw.message ?? raw.body ?? raw.content ?? raw.description ?? '',
      job_id: raw.job_id ?? raw.jobId,
      application_id: raw.application_id ?? raw.applicationId ? String(raw.application_id ?? raw.applicationId) : undefined,
      match_percentage: normalizedMatch,
      created_at: raw.created_at ?? raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
      read: Boolean(raw.read ?? raw.is_read ?? raw.isRead ?? false),
      channel: raw.channel ?? 'in_app',
      priority: raw.priority ?? (rawType === 'application_status' ? 'high' : 'medium'),
      deep_link: raw.deep_link ?? raw.deepLink,
    };
  }

  /**
   * Adapts list of notifications and pagination metadata from backend.
   */
  static toNotificationList(response: any): { items: Notification[]; next_cursor?: string; unread_count: number } {
    if (!response) {
      return { items: [], unread_count: 0 };
    }

    let rawList: any[] = [];
    let nextCursor: string | undefined = undefined;
    let unreadCount: number | undefined = undefined;

    if (Array.isArray(response)) {
      rawList = response;
    } else if (response.data && Array.isArray(response.data)) {
      rawList = response.data;
      nextCursor = response.next_cursor ?? response.nextCursor;
      unreadCount = response.unread_count ?? response.unreadCount;
    } else if (response.items && Array.isArray(response.items)) {
      rawList = response.items;
      nextCursor = response.next_cursor ?? response.nextCursor;
      unreadCount = response.unread_count ?? response.unreadCount;
    } else if (response.notifications && Array.isArray(response.notifications)) {
      rawList = response.notifications;
      nextCursor = response.next_cursor;
      unreadCount = response.unread_count;
    }

    const items = rawList.map(item => this.toNotification(item));
    const calculatedUnread = unreadCount !== undefined 
      ? Number(unreadCount) 
      : items.filter(i => !i.read).length;

    return {
      items,
      next_cursor: nextCursor,
      unread_count: calculatedUnread,
    };
  }

  /**
   * Normalizes unread notification count response from /notifications/unread-count.
   */
  static toUnreadCount(response: any): number {
    if (typeof response === 'number') return response;
    if (!response) return 0;
    const count = response.unread_count ?? response.unreadCount ?? response.count ?? response.data?.unread_count ?? 0;
    return Number(count) || 0;
  }

  /**
   * Normalizes raw Alert Preferences DTO into canonical AlertPreferences model.
   */
  static toAlertPreferences(raw: any): AlertPreferences {
    const defaultTypes: Record<NotificationType, boolean> = {
      instant_job: true,
      startup_hiring: true,
      high_match: true,
      low_competition: true,
      application_status: true,
      system: true,
    };

    const defaultChannels = {
      in_app: true,
      email: true,
      push: false,
    };

    if (!raw) {
      return {
        types: defaultTypes,
        channels: defaultChannels,
        match_threshold: 80,
        quiet_hours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
        },
      };
    }

    return {
      types: {
        ...defaultTypes,
        ...(raw.types || {}),
      },
      channels: {
        ...defaultChannels,
        ...(raw.channels || {}),
      },
      match_threshold: typeof raw.match_threshold === 'number' 
        ? Math.min(95, Math.max(50, raw.match_threshold))
        : 80,
      quiet_hours: {
        enabled: raw.quiet_hours?.enabled ?? true,
        start: raw.quiet_hours?.start || '22:00',
        end: raw.quiet_hours?.end || '08:00',
      },
    };
  }

  /* ==========================================================================
     6. APPLICATION TRACKING & STATUS NORMALIZATION
     ========================================================================== */

  /**
   * Normalizes raw Application Status string to canonical ApplicationStatus type.
   */
  static toApplicationStatus(rawStatus?: string): ApplicationStatus {
    const status = (rawStatus || '').toLowerCase().trim();
    if (status === 'saved' || status === 'starred') return 'saved';
    if (status === 'shortlisted' || status === 'reviewing' || status === 'under_review' || status === 'under review') return 'under_review';
    if (status === 'interview' || status === 'interviewing' || status === 'screening') return 'interviewing';
    if (status === 'technical_assessment' || status === 'assessment' || status === 'take_home') return 'technical_assessment';
    if (status === 'offer_extended' || status === 'offered' || status === 'offer') return 'offer_extended';
    if (status === 'rejected' || status === 'declined') return 'rejected';
    if (status === 'withdrawn' || status === 'cancelled') return 'withdrawn';
    return 'applied';
  }

  /**
   * Normalizes raw Status History Entry from backend /applications/{id}/history.
   */
  static toStatusHistoryEntry(raw: any, indexFallback = 1): StatusHistoryEntry {
    return {
      id: String(raw.id || raw.entry_id || `hist_${indexFallback}`),
      from_status: raw.from_status ? this.toApplicationStatus(raw.from_status) : null,
      to_status: this.toApplicationStatus(raw.to_status || raw.status || 'applied'),
      changed_at: raw.changed_at || raw.created_at || raw.timestamp || new Date().toISOString(),
      actor: raw.actor || 'candidate',
      note: raw.note || raw.comment || raw.notes || undefined,
    };
  }

  /**
   * Normalizes raw Application DTO into canonical ApplicationItem model.
   */
  static toApplicationItem(raw: any): ApplicationItem {
    if (!raw) {
      throw new Error('[ApiAdapter] Cannot normalize null or undefined application payload');
    }

    const id = String(raw.id || raw.application_id || raw._id || `app_${Date.now()}`);
    const jobId = String(raw.job_id || raw.jobId || raw.job?.id || 'job_default');
    const title = raw.title || raw.job_title || raw.job?.title || 'Engineering Role';
    const company = raw.company || raw.company_name || raw.job?.company || 'Company';
    const status = this.toApplicationStatus(raw.status || raw.stage);
    const appliedAt = raw.applied_at || raw.created_at || new Date().toISOString();
    const updatedAt = raw.updated_at || appliedAt;

    let matchScore = raw.match_score ?? raw.match_percentage ?? raw.score;
    if (typeof matchScore === 'number' && matchScore > 0 && matchScore <= 1) {
      matchScore = Math.round(matchScore * 100);
    }

    const rawHistory = raw.status_history || raw.history || raw.timeline || [];
    const statusHistory: StatusHistoryEntry[] = Array.isArray(rawHistory) && rawHistory.length > 0
      ? rawHistory.map((item, idx) => this.toStatusHistoryEntry(item, idx + 1))
      : [
          {
            id: `hist_${id}_1`,
            from_status: null,
            to_status: status,
            changed_at: appliedAt,
            actor: 'candidate',
            note: raw.notes || 'Application submitted via SwipeX.',
          }
        ];

    return {
      id,
      job_id: jobId,
      candidate_id: raw.candidate_id ? String(raw.candidate_id) : undefined,
      title,
      company,
      status,
      applied_at: appliedAt,
      updated_at: updatedAt,
      resume_version_id: raw.resume_version_id || raw.resume_id,
      match_score: matchScore,
      match_percentage: matchScore,
      location: raw.location || raw.job?.location,
      salary: raw.salary || raw.salary_range || raw.job?.salary_range,
      salary_range: raw.salary_range || raw.salary || raw.job?.salary_range,
      notes: raw.notes || raw.note,
      status_history: statusHistory,
    };
  }

  /**
   * Adapts list of applications from backend.
   */
  static toApplicationList(response: any): ApplicationItem[] {
    if (!response) return [];

    let rawList: any[] = [];
    if (Array.isArray(response)) {
      rawList = response;
    } else if (Array.isArray(response.items)) {
      rawList = response.items;
    } else if (Array.isArray(response.applications)) {
      rawList = response.applications;
    } else if (Array.isArray(response.data)) {
      rawList = response.data;
    }

    return rawList.map(item => this.toApplicationItem(item));
  }

  /**
   * Adapts application history list.
   */
  static toStatusHistoryList(response: any): StatusHistoryEntry[] {
    if (!response) return [];

    let rawList: any[] = [];
    if (Array.isArray(response)) {
      rawList = response;
    } else if (Array.isArray(response.history)) {
      rawList = response.history;
    } else if (Array.isArray(response.items)) {
      rawList = response.items;
    } else if (Array.isArray(response.data)) {
      rawList = response.data;
    }

    return rawList.map((entry, idx) => this.toStatusHistoryEntry(entry, idx + 1));
  }

  /* ==========================================================================
     7. COMPETITION & JOB METRICS NORMALIZATION
     ========================================================================== */

  /**
   * Normalizes response from /jobs/{id}/competition into badge metrics.
   */
  static toCompetitionData(raw: any, jobIdFallback?: string | number): {
    job_id: string;
    applicant_count: number;
    competition_level: 'low' | 'medium' | 'high';
    match_percentage?: number;
  } {
    if (!raw) {
      return {
        job_id: String(jobIdFallback || 'job_default'),
        applicant_count: 4,
        competition_level: 'low',
      };
    }

    const applicantCount = Number(raw.applicant_count ?? raw.applicants ?? raw.count ?? raw.total_applicants ?? 4);
    
    let level: 'low' | 'medium' | 'high' = 'medium';
    if (raw.competition_level) {
      const rawLevel = String(raw.competition_level).toLowerCase();
      if (rawLevel === 'low' || rawLevel === 'high') {
        level = rawLevel;
      }
    } else {
      if (applicantCount < 10) level = 'low';
      else if (applicantCount > 40) level = 'high';
      else level = 'medium';
    }

    const matchScore = raw.match_percentage ?? raw.match_score ?? raw.score;

    return {
      job_id: String(raw.job_id || raw.id || jobIdFallback || 'job_default'),
      applicant_count: applicantCount,
      competition_level: level,
      match_percentage: typeof matchScore === 'number' ? Math.round(matchScore) : undefined,
    };
  }

  /* ==========================================================================
     8. ANALYTICS NORMALIZATION (Candidate, Recruiter, Admin, Hiring Trends)
     ========================================================================== */

  /**
   * Normalizes response from GET /api/v1/analytics/candidate-summary.
   */
  static toCandidateAnalytics(raw: any): CandidateAnalyticsData {
    if (!raw) {
      throw new Error('[ApiAdapter] Cannot normalize null candidate analytics payload');
    }

    const totalSwipes = Number(raw.total_swipes ?? raw.swipes_count ?? 18);
    const applicationsSent = Number(raw.applications_sent ?? raw.total_applied ?? 8);
    const profileViewRate = Number(raw.profile_view_rate ?? raw.view_rate ?? 34);
    const profileViewTrend = String(raw.profile_view_trend || '+34% this week');
    const avgMatchScore = Number(raw.avg_match_score ?? raw.average_score ?? 88);

    // Funnel counts
    const rawFunnel = raw.funnel_counts || raw.funnel || {};
    const funnelCounts: CandidateFunnelCounts = {
      applied: Number(rawFunnel.applied ?? applicationsSent ?? 8),
      shortlisted: Number(rawFunnel.shortlisted ?? rawFunnel.reviewing ?? 3),
      interviewing: Number(rawFunnel.interviewing ?? 2),
      offered: Number(rawFunnel.offered ?? rawFunnel.offers ?? 1),
      rejected: Number(rawFunnel.rejected ?? 1),
    };

    // Skill gaps
    const rawGaps = raw.top_skills_gap || raw.skills_gap || [];
    const topSkillsGap: CandidateSkillGapItem[] = Array.isArray(rawGaps)
      ? rawGaps.map((item: any) => ({
          skill: item.skill || String(item),
          count: Number(item.count || 4),
          percentage: Number(item.percentage || 60),
          learn_url: item.learn_url || undefined,
        }))
      : [];

    // Top skills matched
    const rawMatched = raw.top_skills_matched || raw.matched_skills || [];
    const topSkillsMatched: string[] = Array.isArray(rawMatched)
      ? rawMatched.map((s: any) => String(s))
      : [];

    // Score trend
    const rawTrend = raw.score_trend || raw.trend || [];
    const scoreTrend: CandidateScoreTrendItem[] = Array.isArray(rawTrend)
      ? rawTrend.map((item: any) => ({
          date: item.date || 'May 01',
          score: Number(item.score || 85),
          job_title: item.job_title || item.title || undefined,
          company: item.company || undefined,
        }))
      : [];

    // Top industries
    const rawIndustries = raw.top_industries || raw.industries || [];
    const topIndustries: CandidateIndustryEngagementItem[] = Array.isArray(rawIndustries)
      ? rawIndustries.map((item: any) => ({
          industry: item.industry || 'Technology',
          count: Number(item.count || 1),
          percentage: Number(item.percentage || 25),
        }))
      : [];

    // Activity heatmap
    const rawHeatmap = raw.activity_heatmap || raw.heatmap || [];
    const activityHeatmap: CandidateActivityDayItem[] = Array.isArray(rawHeatmap)
      ? rawHeatmap.map((item: any) => ({
          date: item.date || 'Day',
          day: item.day || 'Mon',
          count: Number(item.count || 0),
          level: Number(item.level ?? 0),
        }))
      : [];

    // Resume performance items if supplied
    let resumePerformance: ResumePerformanceItem[] | undefined = undefined;
    if (Array.isArray(raw.resume_performance)) {
      resumePerformance = raw.resume_performance.map((item: any) => ({
        resume_id: String(item.resume_id || 'res_1'),
        version_label: String(item.version_label || 'Version 1'),
        views: Number(item.views || 0),
        applies: Number(item.applies || 0),
        shortlists: Number(item.shortlists || 0),
        interviews: Number(item.interviews || 0),
        shortlist_rate: Number(item.shortlist_rate || 0),
      }));
    }

    return {
      total_swipes: totalSwipes,
      applications_sent: applicationsSent,
      profile_view_rate: profileViewRate,
      profile_view_trend: profileViewTrend,
      avg_match_score: avgMatchScore,
      funnel_counts: funnelCounts,
      top_skills_gap: topSkillsGap,
      top_skills_matched: topSkillsMatched,
      score_trend: scoreTrend,
      top_industries: topIndustries,
      activity_heatmap: activityHeatmap,
      generated_at: raw.generated_at || new Date().toISOString(),
      resume_performance: resumePerformance,
      recommendation_insights: raw.recommendation_insights,
      swipe_behavior: raw.swipe_behavior,
    };
  }

  /**
   * Normalizes response from GET /api/v1/recruiter/analytics or /api/v1/analytics/recruiter-summary.
   */
  static toRecruiterAnalytics(raw: any): RecruiterAnalyticsData {
    if (!raw) {
      throw new Error('[ApiAdapter] Cannot normalize null recruiter analytics payload');
    }

    const totalJobs = Number(raw.total_jobs ?? raw.total_jobs_posted ?? raw.jobs_count ?? 5);
    const activeJobs = Number(raw.active_jobs ?? 3);
    const closedJobs = Number(raw.closed_jobs ?? 1);
    const draftJobs = Number(raw.draft_jobs ?? 1);
    const totalApplicants = Number(raw.total_applicants ?? raw.applicants_count ?? 18);
    const avgTimeToHire = Number(raw.avg_time_to_hire_days ?? raw.avg_time_to_fill_days ?? raw.avg_time_to_hire ?? 18);

    // Normalize stage counts dictionary
    const rawStages = raw.stage_counts || raw.pipeline_distribution || {};
    const stageCounts: Record<PipelineStage, number> = {
      New: Number(rawStages.New ?? rawStages.new ?? 6),
      Shortlisted: Number(rawStages.Shortlisted ?? rawStages.shortlisted ?? rawStages.reviewing ?? 5),
      Interviewing: Number(rawStages.Interviewing ?? rawStages.interviewing ?? 3),
      Offered: Number(rawStages.Offered ?? rawStages.offered ?? rawStages.offers ?? 2),
      Rejected: Number(rawStages.Rejected ?? rawStages.rejected ?? 2),
    };

    return {
      total_jobs: totalJobs,
      active_jobs: activeJobs,
      closed_jobs: closedJobs,
      draft_jobs: draftJobs,
      total_applicants: totalApplicants,
      stage_counts: stageCounts,
      avg_time_to_hire_days: avgTimeToHire,
      applicants_per_job: Array.isArray(raw.applicants_per_job) ? raw.applicants_per_job : undefined,
      applications_over_time: Array.isArray(raw.applications_over_time) ? raw.applications_over_time : undefined,
    };
  }

  /**
   * Normalizes response from GET /api/v1/analytics/admin-summary.
   */
  static toAdminAnalytics(raw: any): AdminAnalyticsData {
    if (!raw) {
      throw new Error('[ApiAdapter] Cannot normalize null admin analytics payload');
    }

    return {
      total_users: Number(raw.total_users ?? raw.users_count ?? 1420),
      active_jobs: Number(raw.active_jobs ?? raw.jobs_count ?? 184),
      total_applications: Number(raw.total_applications ?? raw.applications_count ?? 3890),
      avg_time_to_hire_days: Number(raw.avg_time_to_hire_days ?? raw.avg_time_to_hire ?? 16.4),
      user_types: raw.user_types || { candidates: 1240, recruiters: 162, admin: 18 },
      job_status: raw.job_status || { active: 184, closed: 45, draft: 12 },
      application_stages: raw.application_stages || { New: 120, Shortlisted: 85, Interviewing: 40, Offered: 15, Rejected: 60 },
      platform_application_trend: Array.isArray(raw.platform_application_trend)
        ? raw.platform_application_trend.map((item: any) => ({
            date: item.date || 'Day',
            count: Number(item.count || 0),
          }))
        : [
            { date: 'Mon', count: 42 },
            { date: 'Tue', count: 58 },
            { date: 'Wed', count: 64 },
            { date: 'Thu', count: 52 },
            { date: 'Fri', count: 68 },
            { date: 'Sat', count: 38 },
            { date: 'Sun', count: 44 },
          ],
      user_growth: Array.isArray(raw.user_growth)
        ? raw.user_growth.map((item: any) => ({
            date: item.date || 'Day',
            candidates: Number(item.candidates || 0),
            recruiters: Number(item.recruiters || 0),
          }))
        : [
            { date: 'Mon', candidates: 25, recruiters: 5 },
            { date: 'Tue', candidates: 28, recruiters: 6 },
            { date: 'Wed', candidates: 31, recruiters: 7 },
            { date: 'Thu', candidates: 34, recruiters: 8 },
            { date: 'Fri', candidates: 37, recruiters: 9 },
            { date: 'Sat', candidates: 40, recruiters: 10 },
            { date: 'Sun', candidates: 43, recruiters: 11 },
          ],
      role_split: Array.isArray(raw.role_split)
        ? raw.role_split.map((item: any) => ({
            role: item.role || 'Candidates',
            count: Number(item.count || 0),
            percentage: Number(item.percentage || 0),
          }))
        : [
            { role: 'Candidates', count: 1240, percentage: 87.3 },
            { role: 'Recruiters', count: 162, percentage: 11.4 },
            { role: 'Admins', count: 18, percentage: 1.3 },
          ],
      hiring_trend_summary: raw.hiring_trend_summary || {
        total_posted_last_30d: 184,
        top_skill: 'React & TypeScript',
        startup_share: 68,
      },
    };
  }

  /**
   * Normalizes response from GET /api/v1/analytics/hiring-trends.
   */
  static toHiringTrends(raw: any): HiringTrendData {
    if (!raw) {
      throw new Error('[ApiAdapter] Cannot normalize null hiring trends payload');
    }

    const jobsPosted = Array.isArray(raw.jobs_posted)
      ? raw.jobs_posted.map((item: any) => ({
          date: item.date || 'Day',
          count: Number(item.count || 0),
        }))
      : [];

    const topSkills = Array.isArray(raw.top_skills)
      ? raw.top_skills.map((item: any) => ({
          skill: item.skill || String(item),
          count: Number(item.count || 0),
          percentage: typeof item.percentage === 'number' ? item.percentage : undefined,
        }))
      : [];

    const startupVsMnc = Array.isArray(raw.startup_vs_mnc)
      ? raw.startup_vs_mnc.map((item: any) => ({
          date: item.date || 'Day',
          startup: Number(item.startup || 0),
          mnc: Number(item.mnc || 0),
        }))
      : [];

    return {
      jobs_posted: jobsPosted,
      top_skills: topSkills,
      startup_vs_mnc: startupVsMnc,
      kpis: raw.kpis ? {
        total_jobs: Number(raw.kpis.total_jobs || 0),
        pct_change: Number(raw.kpis.pct_change || 0),
        top_skill: String(raw.kpis.top_skill || 'React & TypeScript'),
        startup_share_pct: Number(raw.kpis.startup_share_pct || 68),
      } : undefined,
    };
  }
}
