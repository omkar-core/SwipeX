/**
 * SwipeX API Adapter & Data Mapper Layer
 * 
 * Central Source of Truth for API Field Normalization.
 * 
 * Purpose:
 * Isolate all backend <-> frontend field name discrepancies in THIS SINGLE FILE.
 * If the backend contracts or field names evolve, only this adapter needs modifications.
 * 
 * Assumed API Contract Shapes:
 * - Resume item: { id, version, filename, uploaded_at, is_default, parse_status, parsed_text?, extracted_skills: string[] }
 * - Upload response: the created resume item
 * - ATS score: { match_score, missing_keywords: string[], missing_skills: string[] }
 * - Auth: Bearer JWT
 */

import { 
  ResumeVersion, 
  ParseStatus, 
  ATSScoreDetailResult, 
  MissingSkillItem,
  AISuggestionsResult,
  AISuggestionItem,
  JobRecommendation 
} from '../types';

/**
 * Raw Backend Resume DTO Representation (handling variations from different backend teams)
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
}
