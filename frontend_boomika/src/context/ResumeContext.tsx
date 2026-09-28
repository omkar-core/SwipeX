import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  ResumeVersion, 
  ResumeData, 
  ATSScoreResult, 
  ATSScoreDetailResult,
  AISuggestionItem 
} from '../types';
import { ResumeService, INITIAL_MOCK_RESUME_VERSIONS } from '../services/resumeService';
import { AtsService } from '../services/atsService';
import { useToast } from './ToastContext';

interface ResumeContextType {
  // Milestone 3 Multi-Version state
  versions: ResumeVersion[];
  activeResume: ResumeVersion | null;
  activeResumeId: string;
  isLoadingVersions: boolean;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  atsDetail: ATSScoreDetailResult | null;
  aiSuggestions: AISuggestionItem[];
  isLoadingAts: boolean;

  // Actions
  uploadResumeVariant: (file: File, versionLabel?: string, isDefault?: boolean) => Promise<ResumeVersion>;
  setDefaultResume: (resumeId: string) => Promise<void>;
  deleteResumeVersion: (resumeId: string) => Promise<void>;
  parseResumeVariant: (resumeId: string) => Promise<ResumeVersion>;
  setActiveResumeId: (resumeId: string) => void;
  updateSkills: (resumeId: string, skills: string[]) => Promise<void>;
  evaluateJobAts: (resumeId: string, jobId: string) => Promise<ATSScoreDetailResult>;
  fetchAiSuggestions: (resumeId: string, jobId: string) => Promise<void>;
  refreshVersions: () => Promise<void>;

  // Milestone 1 & 2 Backwards Compatibility
  resume: ResumeData;
  atsResult: ATSScoreResult | null;
  uploadResumeFile: (file: File) => Promise<void>;
  resetToDefaultResume: () => void;
  fetchAtsScore: (jobId?: string) => Promise<ATSScoreResult>;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export const ResumeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  
  const [versions, setVersions] = useState<ResumeVersion[]>(INITIAL_MOCK_RESUME_VERSIONS);
  const [activeResumeId, setActiveResumeIdState] = useState<string>(() => {
    return localStorage.getItem('swipex_active_resume_id') || INITIAL_MOCK_RESUME_VERSIONS[0].resume_id;
  });
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [atsDetail, setAtsDetail] = useState<ATSScoreDetailResult | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestionItem[]>([]);
  const [isLoadingAts, setIsLoadingAts] = useState<boolean>(false);

  // Load versions
  const refreshVersions = useCallback(async () => {
    setIsLoadingVersions(true);
    try {
      const list = await ResumeService.getResumeVersions();
      setVersions(list);
      const defaultVer = list.find(v => v.is_default) || list[0];
      if (defaultVer && !list.some(v => v.resume_id === activeResumeId)) {
        setActiveResumeIdState(defaultVer.resume_id);
      }
    } catch (err: any) {
      console.error('Failed to load resume versions:', err);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [activeResumeId]);

  useEffect(() => {
    refreshVersions();
  }, [refreshVersions]);

  const activeResume = versions.find(v => v.resume_id === activeResumeId) || versions[0] || null;

  const setActiveResumeId = useCallback((id: string) => {
    setActiveResumeIdState(id);
    localStorage.setItem('swipex_active_resume_id', id);
  }, []);

  // Upload new resume variant
  const uploadResumeVariant = useCallback(async (
    file: File, 
    versionLabel?: string, 
    isDefault = false
  ): Promise<ResumeVersion> => {
    setIsUploading(true);
    setUploadProgress(15);
    setUploadError(null);

    // Progress tick simulation
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 120);

    try {
      const created = await ResumeService.uploadResume(file, versionLabel, isDefault);
      clearInterval(interval);
      setUploadProgress(100);

      await refreshVersions();
      setActiveResumeId(created.resume_id);

      showToast(`Resume "${file.name}" uploaded successfully (v${created.version})!`, 'success');
      return created;
    } catch (err: any) {
      clearInterval(interval);
      const msg = err.message || 'Error uploading and parsing resume';
      setUploadError(msg);
      showToast(msg, 'error');
      throw err;
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  }, [refreshVersions, setActiveResumeId, showToast]);

  // Trigger or retry parsing
  const parseResumeVariant = useCallback(async (resumeId: string): Promise<ResumeVersion> => {
    try {
      showToast('Triggering semantic NLP parsing...', 'info');
      const parsed = await ResumeService.parseResume(resumeId);
      await refreshVersions();
      setActiveResumeId(parsed.resume_id);
      showToast(`Resume "${parsed.filename}" parsed successfully! Extracted ${(parsed.parsed_skills || []).length} technical skills.`, 'success');
      return parsed;
    } catch (err: any) {
      const msg = err.message || 'Parsing failed. Please check document syntax and retry.';
      showToast(msg, 'error');
      throw err;
    }
  }, [refreshVersions, setActiveResumeId, showToast]);

  // Set active default
  const setDefaultResume = useCallback(async (resumeId: string) => {
    try {
      await ResumeService.setDefaultResume(resumeId);
      await refreshVersions();
      setActiveResumeId(resumeId);
      showToast('Set as active default resume version.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update default version', 'error');
    }
  }, [refreshVersions, setActiveResumeId, showToast]);

  // Delete resume version
  const deleteResumeVersion = useCallback(async (resumeId: string) => {
    try {
      await ResumeService.deleteResumeVersion(resumeId);
      await refreshVersions();
      showToast('Resume version deleted.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete version', 'error');
    }
  }, [refreshVersions, showToast]);

  // Update skills
  const updateSkills = useCallback(async (resumeId: string, skills: string[]) => {
    try {
      await ResumeService.updateResumeSkills(resumeId, skills);
      await refreshVersions();
      showToast('Resume skills updated.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update skills', 'error');
    }
  }, [refreshVersions, showToast]);

  // Evaluate ATS Score (Mock / Heuristic)
  const evaluateJobAts = useCallback(async (resumeId: string, jobId: string): Promise<ATSScoreDetailResult> => {
    setIsLoadingAts(true);
    try {
      const result = await AtsService.getAtsScore(resumeId, jobId);
      setAtsDetail(result);
      return result;
    } catch (err: any) {
      console.error('Error evaluating ATS score:', err);
      const fallback: ATSScoreDetailResult = {
        resume_id: resumeId,
        job_id: jobId,
        match_score: 84,
        is_interview_ready: true,
        benchmark_threshold: 80,
        matched_skills: ['React', 'TypeScript', 'Tailwind CSS'],
        missing_skills: [{ skill: 'GraphQL', importance: 'high' }],
        missing_keywords: ['Playwright end-to-end testing'],
        generated_by: 'SwipeX-Neural-ATS-Fallback',
        evaluated_at: new Date().toISOString()
      };
      setAtsDetail(fallback);
      return fallback;
    } finally {
      setIsLoadingAts(false);
    }
  }, []);

  // Fetch AI suggestions
  const fetchAiSuggestions = useCallback(async (resumeId: string, jobId: string) => {
    try {
      const res = await AtsService.getAiSuggestions(resumeId, jobId);
      setAiSuggestions(res.suggestions);
    } catch (err: any) {
      console.error('Failed to fetch AI suggestions:', err);
    }
  }, []);

  // Backwards compatibility mappings for M1/M2 components
  const resume: ResumeData = {
    resume_id: activeResume?.resume_id || 'res_default',
    filename: activeResume?.filename || 'Alex_Mercer_Frontend_2026.pdf',
    file_size: activeResume?.file_size || '1.2 MB',
    uploaded_at: activeResume?.uploaded_at || new Date().toISOString(),
    parsed_skills: activeResume?.parsed_skills || ['React', 'TypeScript', 'Tailwind CSS'],
    overall_fit_score: activeResume?.overall_fit_score || 88,
    format_compatibility: activeResume?.format_compatibility || 'High',
    status: activeResume?.parse_status === 'failed' ? 'error' : activeResume?.parse_status === 'analyzing' ? 'analyzing' : 'parsed',
    progress: 100
  };

  const atsResult: ATSScoreResult | null = atsDetail ? {
    match_score: atsDetail.match_score,
    missing_keywords: atsDetail.missing_keywords,
    generated_by: atsDetail.generated_by
  } : {
    match_score: 88,
    missing_keywords: ['GraphQL Automation', 'Design Tokens'],
    generated_by: 'SwipeX-Neural-ATS-v4.2'
  };

  const uploadResumeFile = useCallback(async (file: File) => {
    await uploadResumeVariant(file, undefined, true);
  }, [uploadResumeVariant]);

  const resetToDefaultResume = useCallback(() => {
    localStorage.removeItem('swipex_resume_versions');
    localStorage.removeItem('swipex_active_resume_id');
    setVersions(INITIAL_MOCK_RESUME_VERSIONS);
    setActiveResumeIdState(INITIAL_MOCK_RESUME_VERSIONS[0].resume_id);
    showToast('Reset to demo resume versions', 'info');
  }, [showToast]);

  const fetchAtsScore = useCallback(async (jobId?: string): Promise<ATSScoreResult> => {
    const res = await evaluateJobAts(activeResumeId, jobId || 'job_nexus_01');
    return {
      match_score: res.match_score,
      missing_keywords: res.missing_keywords,
      generated_by: res.generated_by
    };
  }, [activeResumeId, evaluateJobAts]);

  return (
    <ResumeContext.Provider
      value={{
        versions,
        activeResume,
        activeResumeId,
        isLoadingVersions,
        isUploading,
        uploadProgress,
        uploadError,
        atsDetail,
        aiSuggestions,
        isLoadingAts,
        uploadResumeVariant,
        setDefaultResume,
        deleteResumeVersion,
        parseResumeVariant,
        setActiveResumeId,
        updateSkills,
        evaluateJobAts,
        fetchAiSuggestions,
        refreshVersions,
        resume,
        atsResult,
        uploadResumeFile,
        resetToDefaultResume,
        fetchAtsScore,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
};

export const useResume = () => {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within ResumeProvider');
  }
  return context;
};
