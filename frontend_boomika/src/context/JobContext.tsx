import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Job, FilterState, SavedJob, TimelineItem, RecommendedAction } from '../types';
import { ApiService } from '../services/api';
import { MOCK_JOBS, MOCK_TIMELINE, MOCK_RECOMMENDED_ACTIONS, MOCK_SAVED_JOBS } from '../data/mockData';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

interface JobContextType {
  jobs: Job[];
  allJobs: Job[];
  currentIndex: number;
  currentJob: Job | null;
  filters: FilterState;
  savedJobs: SavedJob[];
  timeline: TimelineItem[];
  recommendedActions: RecommendedAction[];
  isLoadingJobs: boolean;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  handleSwipe: (direction: 'left' | 'right') => Promise<void>;
  resetDeck: () => void;
  saveCurrentJob: () => Promise<void>;
  passCurrentJob: () => Promise<void>;
  toggleWorkEnvironment: (env: 'Remote' | 'Hybrid' | 'On-site') => void;
  setIndustry: (industry: string) => void;
  setSalaryRange: (min: number, max: number) => void;
  refetchJobs: () => Promise<void>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [allJobs, setAllJobs] = useState<Job[]>(MOCK_JOBS);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    industry: 'All',
    salaryMin: 120000,
    salaryMax: 270000,
    workEnvironments: ['Remote', 'Hybrid', 'On-site'],
  });

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(MOCK_SAVED_JOBS);
  const [timeline, setTimeline] = useState<TimelineItem[]>(MOCK_TIMELINE);
  const [recommendedActions] = useState<RecommendedAction[]>(MOCK_RECOMMENDED_ACTIONS);

  // Fetch jobs from backend / mock service with filter parameters
  const fetchJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const fetched = await ApiService.getJobs({
        industry: filters.industry !== 'All' ? filters.industry : undefined,
        salary_min: filters.salaryMin,
        salary_max: filters.salaryMax,
        remote: filters.workEnvironments.join(','),
      });
      setJobs(fetched);
      setAllJobs(fetched);
      setCurrentIndex(0);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch job listings from backend', 'error');
    } finally {
      setIsLoadingJobs(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchJobs();
  }, [isAuthenticated, fetchJobs]);

  const currentJob = jobs[currentIndex] || null;

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!currentJob) return;

    try {
      // POST swipe to service
      await ApiService.postSwipe({ job_id: String(currentJob.job_id), direction });
      
      if (direction === 'right') {
        showToast(`Saved ${currentJob.title} at ${currentJob.company}!`, 'success');
        
        // Add to saved jobs state
        setSavedJobs(prev => {
          if (prev.some(s => s.title === currentJob.title && s.company === currentJob.company)) {
            return prev;
          }
          const logoColors = ['bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600'];
          const randomColor = logoColors[Math.floor(Math.random() * logoColors.length)];
          const newSaved: SavedJob = {
            id: `saved_${currentJob.job_id}_${Date.now()}`,
            title: currentJob.title,
            company: currentJob.company,
            location: currentJob.location,
            logoLetter: currentJob.company.charAt(0).toUpperCase(),
            logoBgColor: randomColor,
            savedAt: 'Just now'
          };
          return [newSaved, ...prev];
        });

        // Add to timeline application pipeline
        setTimeline(prev => {
          if (prev.some(t => t.company === currentJob.company && t.title.includes(currentJob.title))) {
            return prev;
          }
          const newTimelineItem: TimelineItem = {
            id: `timeline_${currentJob.job_id}_${Date.now()}`,
            type: 'submitted',
            title: `Application Submitted`,
            company: currentJob.company,
            time: 'Just now',
            description: `Saved & applied for ${currentJob.title} at ${currentJob.company}. Match Score: ${currentJob.match_score ?? currentJob.ats_match_score ?? 85}%.`,
            status: 'Active'
          };
          return [newTimelineItem, ...prev];
        });
      } else {
        showToast(`Passed on ${currentJob.company}`, 'info');
      }

      setCurrentIndex(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Recorded swipe locally', 'info');
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentJob, showToast]);

  const saveCurrentJob = useCallback(async () => {
    await handleSwipe('right');
  }, [handleSwipe]);

  const passCurrentJob = useCallback(async () => {
    await handleSwipe('left');
  }, [handleSwipe]);

  const resetDeck = useCallback(() => {
    setCurrentIndex(0);
    showToast('Job deck reset!', 'info');
  }, [showToast]);

  const toggleWorkEnvironment = useCallback((env: 'Remote' | 'Hybrid' | 'On-site') => {
    setFilters(prev => {
      const exists = prev.workEnvironments.includes(env);
      const updated = exists
        ? prev.workEnvironments.filter(e => e !== env)
        : [...prev.workEnvironments, env];
      return { ...prev, workEnvironments: updated };
    });
  }, []);

  const setIndustry = useCallback((industry: string) => {
    setFilters(prev => ({ ...prev, industry }));
  }, []);

  const setSalaryRange = useCallback((salaryMin: number, salaryMax: number) => {
    setFilters(prev => ({ ...prev, salaryMin, salaryMax }));
  }, []);

  return (
    <JobContext.Provider
      value={{
        jobs,
        allJobs,
        currentIndex,
        currentJob,
        filters,
        savedJobs,
        timeline,
        recommendedActions,
        isLoadingJobs,
        setFilters,
        handleSwipe,
        resetDeck,
        saveCurrentJob,
        passCurrentJob,
        toggleWorkEnvironment,
        setIndustry,
        setSalaryRange,
        refetchJobs: fetchJobs,
      }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJobs = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobs must be used within JobProvider');
  }
  return context;
};
