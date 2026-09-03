import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RecruiterJob, 
  Applicant, 
  CreateJobInput, 
  JobStatus, 
  PipelineStage, 
  RecruiterAnalyticsData 
} from '../types';
import { RecruiterApiService } from '../services/api';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

interface RecruiterContextType {
  postedJobs: RecruiterJob[];
  applicantsByJob: Record<string, Applicant[]>;
  selectedJobId: string | number | null;
  selectedJob: RecruiterJob | null;
  isLoading: boolean;
  analyticsData: RecruiterAnalyticsData;
  createJob: (jobData: CreateJobInput) => Promise<RecruiterJob>;
  updateJobStatus: (jobId: string | number, status: JobStatus) => Promise<void>;
  moveApplicantStage: (
    jobId: string | number, 
    applicationIdOrCandidateId: string, 
    newStage: PipelineStage,
    notes?: string
  ) => Promise<void>;
  fetchApplicants: (jobId: string | number) => Promise<Applicant[]>;
  setSelectedJobId: (id: string | number | null) => void;
  refreshJobs: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
}

const DEFAULT_ANALYTICS: RecruiterAnalyticsData = {
  total_jobs: 0,
  active_jobs: 0,
  closed_jobs: 0,
  draft_jobs: 0,
  total_applicants: 0,
  stage_counts: {
    New: 0,
    Shortlisted: 0,
    Interviewing: 0,
    Offered: 0,
    Rejected: 0,
  },
  avg_time_to_hire_days: 18,
};

const RecruiterContext = createContext<RecruiterContextType | undefined>(undefined);

export const RecruiterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { currentRole } = useAuth();
  const [postedJobs, setPostedJobs] = useState<RecruiterJob[]>([]);
  const [applicantsByJob, setApplicantsByJob] = useState<Record<string, Applicant[]>>({});
  const [selectedJobId, setSelectedJobId] = useState<string | number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<RecruiterAnalyticsData>(DEFAULT_ANALYTICS);

  // Fetch posted jobs
  const fetchPostedJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const jobs = await RecruiterApiService.getPostedJobs();
      setPostedJobs(jobs);
      if (jobs.length > 0 && selectedJobId === null) {
        setSelectedJobId(jobs[0].job_id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load recruiter job postings', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId, showToast]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await RecruiterApiService.getAnalytics();
      setAnalyticsData(data);
    } catch {
      // Keep existing analytics data
    }
  }, []);

  // Fetch applicants for a specific job
  const fetchApplicants = useCallback(async (jobId: string | number): Promise<Applicant[]> => {
    const key = String(jobId);
    try {
      const applicants = await RecruiterApiService.getApplicants(jobId);
      setApplicantsByJob(prev => ({ ...prev, [key]: applicants }));
      return applicants;
    } catch (err: any) {
      showToast(err.message || `Failed to load applicants for job ${jobId}`, 'error');
      return [];
    }
  }, [showToast]);

  // Load initial data when role is recruiter or admin
  useEffect(() => {
    if (currentRole === 'recruiter' || currentRole === 'admin') {
      fetchPostedJobs();
      fetchAnalytics();
    }
  }, [currentRole, fetchPostedJobs, fetchAnalytics]);

  // Fetch applicants when selectedJobId changes
  useEffect(() => {
    if (selectedJobId !== null) {
      fetchApplicants(selectedJobId);
    }
  }, [selectedJobId, fetchApplicants]);

  // Create a new job
  const createJob = useCallback(async (jobData: CreateJobInput): Promise<RecruiterJob> => {
    setIsLoading(true);
    try {
      const created = await RecruiterApiService.createJob(jobData);
      setPostedJobs(prev => [created, ...prev]);
      setSelectedJobId(created.job_id);
      showToast(`Successfully published "${created.title}"!`, 'success');
      fetchAnalytics();
      return created;
    } catch (err: any) {
      showToast(err.message || 'Failed to post job listing', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAnalytics, showToast]);

  // Update job status
  const updateJobStatus = useCallback(async (jobId: string | number, status: JobStatus): Promise<void> => {
    try {
      const updated = await RecruiterApiService.updateJobStatus(jobId, status);
      setPostedJobs(prev => prev.map(j => String(j.job_id) === String(jobId) ? { ...j, status } : j));
      showToast(`Updated job status to ${status.toUpperCase()}`, 'success');
      fetchAnalytics();
    } catch (err: any) {
      showToast(err.message || 'Failed to update job status', 'error');
    }
  }, [fetchAnalytics, showToast]);

  // Move applicant to new stage
  const moveApplicantStage = useCallback(async (
    jobId: string | number,
    applicationIdOrCandidateId: string,
    newStage: PipelineStage,
    notes?: string
  ): Promise<void> => {
    const key = String(jobId);
    const currentList = applicantsByJob[key] || [];
    
    // Find target application by applicationId or candidate_id
    const target = currentList.find(
      a => a.application_id === applicationIdOrCandidateId || a.candidate_id === applicationIdOrCandidateId
    );

    if (!target) {
      showToast('Applicant record not found', 'error');
      return;
    }

    const appId = target.application_id;

    // Optimistic UI update
    setApplicantsByJob(prev => {
      const list = prev[key] || [];
      return {
        ...prev,
        [key]: list.map(a => a.application_id === appId ? { ...a, stage: newStage, notes: notes ?? a.notes } : a),
      };
    });

    try {
      await RecruiterApiService.updateApplicantStage(appId, newStage, notes);
      showToast(`Moved ${target.candidate.name} to ${newStage}`, 'info');
      fetchAnalytics();
    } catch (err: any) {
      // Revert if error
      setApplicantsByJob(prev => ({ ...prev, [key]: currentList }));
      showToast(err.message || 'Failed to update applicant stage', 'error');
    }
  }, [applicantsByJob, fetchAnalytics, showToast]);

  const selectedJob = useMemo(() => {
    return postedJobs.find(j => String(j.job_id) === String(selectedJobId)) || postedJobs[0] || null;
  }, [postedJobs, selectedJobId]);

  return (
    <RecruiterContext.Provider
      value={{
        postedJobs,
        applicantsByJob,
        selectedJobId,
        selectedJob,
        isLoading,
        analyticsData,
        createJob,
        updateJobStatus,
        moveApplicantStage,
        fetchApplicants,
        setSelectedJobId,
        refreshJobs: fetchPostedJobs,
        refreshAnalytics: fetchAnalytics,
      }}
    >
      {children}
    </RecruiterContext.Provider>
  );
};

export const useRecruiter = () => {
  const context = useContext(RecruiterContext);
  if (!context) {
    throw new Error('useRecruiter must be used within RecruiterProvider');
  }
  return context;
};
