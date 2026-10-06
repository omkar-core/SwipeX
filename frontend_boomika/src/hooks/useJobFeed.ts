import { useState, useCallback, useMemo, useEffect } from 'react';
import { Job } from '../types';
import { MOCK_JOBS_M2 } from '../data/mockJobsMilestone2';
import { FiltersState } from '../components/discover/FiltersPanel';
import { getCompetitionLevel, isEarlyApplicant } from '../utils/competition';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

export interface SwipedHistoryItem {
  job: Job;
  direction: 'right' | 'left';
  swipedAt: string;
}

export interface UseJobFeedReturn {
  jobs: Job[];
  currentJob: Job | null;
  nextJob: Job | null;
  currentIndex: number;
  isDeckEmpty: boolean;
  canUndo: boolean;
  swipedHistory: SwipedHistoryItem[];
  activeFilters: FiltersState | null;
  applyFilters: (filters: FiltersState) => void;
  resetFilters: () => void;
  recordSwipe: (jobId: string | number, direction: 'right' | 'left') => Promise<void>;
  undoLastSwipe: () => Promise<Job | null>;
  resetDeck: () => void;
}

/**
 * Filters a list of jobs based on the active FiltersState.
 */
export function filterJobsList(allJobs: Job[], filters: FiltersState | null): Job[] {
  if (!filters) return allJobs;

  return allJobs.filter((job) => {
    // 1. Search Query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(q);
      const matchCompany = job.company.toLowerCase().includes(q);
      const matchSkills = (job.skills_required || job.skills || []).some((s) =>
        s.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchCompany && !matchSkills) return false;
    }

    // 2. Company Types
    if (filters.companyTypes && filters.companyTypes.length > 0) {
      if (!job.company_type || !filters.companyTypes.includes(job.company_type)) {
        return false;
      }
    }

    // 3. Work Environments
    if (filters.workEnvironments && filters.workEnvironments.length > 0) {
      if (
        job.work_environment &&
        !filters.workEnvironments.includes(job.work_environment)
      ) {
        return false;
      }
    }

    // 4. Fresher Friendly
    if (filters.fresherFriendly) {
      const isFresher =
        job.is_fresher_friendly ||
        job.experience_level === 'Entry / Fresher' ||
        job.title.toLowerCase().includes('junior') ||
        job.title.toLowerCase().includes('associate');
      if (!isFresher) return false;
    }

    // 5. Low Competition Filter (<10 applicants / 'low' level)
    if (filters.lowCompetition) {
      const compLevel = getCompetitionLevel(job);
      if (compLevel !== 'low') return false;
    }

    // 6. Recently Posted (<48 hours)
    if (filters.recentlyPosted) {
      const isRecent = isEarlyApplicant(job);
      if (!isRecent) return false;
    }

    return true;
  });
}

/**
 * useJobFeed Hook
 * Data abstraction layer for SwipeX Discovery Feed with real filtering support.
 */
export function useJobFeed(initialJobs: Job[] = MOCK_JOBS_M2): UseJobFeedReturn {
  const [allJobs, setAllJobs] = useState<Job[]>(initialJobs);
  const [activeFilters, setActiveFilters] = useState<FiltersState | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [swipedHistory, setSwipedHistory] = useState<SwipedHistoryItem[]>([]);

  // Fetch live jobs if not mock mode
  useEffect(() => {
    if (!API_CONFIG.USE_MOCK) {
      const fetchLiveJobs = async () => {
        try {
          const query = new URLSearchParams();
          if (activeFilters?.lowCompetition) query.set('low_competition', 'true');
          if (activeFilters?.recentlyPosted) query.set('recently_posted', 'true');
          if (activeFilters?.searchQuery) query.set('q', activeFilters.searchQuery);

          const res = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.JOBS.LIST}?${query.toString()}`);
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : data.data || data.items || [];
            if (list.length > 0) {
              setAllJobs(list);
            }
          }
        } catch {
          // Fallback silently to initialJobs
        }
      };
      fetchLiveJobs();
    }
  }, [activeFilters]);

  // Apply client-side filters (in mock and fallback modes)
  const filteredJobs = useMemo(() => {
    return filterJobsList(allJobs, activeFilters);
  }, [allJobs, activeFilters]);

  const currentJob = useMemo(() => {
    return currentIndex < filteredJobs.length ? filteredJobs[currentIndex] : null;
  }, [filteredJobs, currentIndex]);

  const nextJob = useMemo(() => {
    return currentIndex + 1 < filteredJobs.length ? filteredJobs[currentIndex + 1] : null;
  }, [filteredJobs, currentIndex]);

  const isDeckEmpty = useMemo(() => {
    return currentIndex >= filteredJobs.length;
  }, [currentIndex, filteredJobs.length]);

  const canUndo = useMemo(() => {
    return swipedHistory.length > 0 && currentIndex > 0;
  }, [swipedHistory.length, currentIndex]);

  const applyFilters = useCallback((filters: FiltersState) => {
    setActiveFilters(filters);
    setCurrentIndex(0);
  }, []);

  const resetFilters = useCallback(() => {
    setActiveFilters(null);
    setCurrentIndex(0);
  }, []);

  const recordSwipe = useCallback(
    async (jobId: string | number, direction: 'right' | 'left') => {
      const job = filteredJobs.find((j) => String(j.job_id) === String(jobId)) || currentJob;
      if (!job) return;

      const historyEntry: SwipedHistoryItem = {
        job,
        direction,
        swipedAt: new Date().toISOString(),
      };

      setSwipedHistory((prev) => [...prev, historyEntry]);
      setCurrentIndex((prev) => prev + 1);
    },
    [filteredJobs, currentJob]
  );

  const undoLastSwipe = useCallback(async (): Promise<Job | null> => {
    if (swipedHistory.length === 0 || currentIndex <= 0) return null;

    const lastEntry = swipedHistory[swipedHistory.length - 1];
    setSwipedHistory((prev) => prev.slice(0, -1));
    setCurrentIndex((prev) => Math.max(0, prev - 1));

    return lastEntry.job;
  }, [swipedHistory, currentIndex]);

  const resetDeck = useCallback(() => {
    setCurrentIndex(0);
    setSwipedHistory([]);
  }, []);

  return {
    jobs: filteredJobs,
    currentJob,
    nextJob,
    currentIndex,
    isDeckEmpty,
    canUndo,
    swipedHistory,
    activeFilters,
    applyFilters,
    resetFilters,
    recordSwipe,
    undoLastSwipe,
    resetDeck,
  };
}
