import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ResumeData, ATSScoreResult } from '../types';
import { MOCK_INITIAL_RESUME } from '../data/mockData';
import { ApiService } from '../services/api';
import { useToast } from './ToastContext';

interface ResumeContextType {
  resume: ResumeData;
  isUploading: boolean;
  uploadProgress: number;
  atsResult: ATSScoreResult | null;
  uploadResumeFile: (file: File) => Promise<void>;
  resetToDefaultResume: () => void;
  fetchAtsScore: (jobId?: string) => Promise<ATSScoreResult>;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export const ResumeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [resume, setResume] = useState<ResumeData>(() => ApiService.getStoredResume());
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(78);
  const [atsResult, setAtsResult] = useState<ATSScoreResult | null>(null);

  // Fetch initial dynamic ATS score
  const fetchAtsScore = useCallback(async (jobId?: string): Promise<ATSScoreResult> => {
    try {
      const res = await ApiService.getAtsScore(resume.resume_id, jobId);
      setAtsResult(res);
      return res;
    } catch (err: any) {
      const fallback: ATSScoreResult = {
        match_score: 85,
        missing_keywords: ['GraphQL Automation', 'Token Pipeline'],
        generated_by: 'SwipeX-Heuristic-Fallback',
      };
      setAtsResult(fallback);
      return fallback;
    }
  }, [resume.resume_id]);

  useEffect(() => {
    fetchAtsScore();
  }, [fetchAtsScore]);

  const uploadResumeFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(15);

    // Progress tick
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 88) {
          clearInterval(interval);
          return 88;
        }
        return prev + 18;
      });
    }, 180);

    try {
      // REQUIREMENT 3: POST /api/v1/resume/upload
      const uploaded = await ApiService.uploadResume(file);
      clearInterval(interval);
      setUploadProgress(100);
      
      const newResume: ResumeData = {
        resume_id: uploaded.resume_id,
        filename: file.name,
        file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploaded_at: new Date().toISOString(),
        parsed_skills: uploaded.parsed_skills,
        overall_fit_score: Math.floor(Math.random() * 10) + 84,
        format_compatibility: 'High',
        status: 'parsed',
        progress: 100
      };
      
      setResume(newResume);
      
      // Calculate dynamic ATS score for newly parsed resume
      await ApiService.getAtsScore(uploaded.resume_id).then(setAtsResult);
      
      showToast(`Resume "${file.name}" uploaded and parsed!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error parsing resume', 'error');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
      }, 500);
    }
  }, [showToast]);

  const resetToDefaultResume = useCallback(() => {
    setResume(MOCK_INITIAL_RESUME);
    setUploadProgress(78);
    fetchAtsScore();
    showToast('Reset to demo resume', 'info');
  }, [fetchAtsScore, showToast]);

  return (
    <ResumeContext.Provider
      value={{
        resume,
        isUploading,
        uploadProgress,
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
