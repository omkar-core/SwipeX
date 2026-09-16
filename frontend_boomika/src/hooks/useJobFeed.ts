import { useState, useCallback, useMemo } from 'react';
import { Job, SwipeDirection } from '../types';
import { MOCK_JOBS_M2 } from '../data/mockJobsMilestone2';

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
  recordSwipe: (jobId: string | number, direction: 'right' | 'left') => Promise<void>;
  undoLastSwipe: () => Promise<Job | null>;
  resetDeck: () => void;
}

/**
 * useJobFeed Hook
 * Data abstraction layer for Milestone 2 Swipe Deck.
 * 
 * Architecture Note:
 * - Day 2: Operates against local in-memory mock dataset (MOCK_JOBS_M2).
 * - Day 3: The `recordSwipe` method and initial `jobs` fetch will swap to live
 *   GET /api/v1/jobs and POST /api/v1/swipes with ZERO changes required to UI components.
 */
export function useJobFeed(initialJobs: Job[] = MOCK_JOBS_M2): UseJobFeedReturn {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [swipedHistory, setSwipedHistory] = useState<SwipedHistoryItem[]>([]);

  const currentJob = useMemo(() => {
    return currentIndex < jobs.length ? jobs[currentIndex] : null;
  }, [jobs, currentIndex]);

  const nextJob = useMemo(() => {
    return currentIndex + 1 < jobs.length ? jobs[currentIndex + 1] : null;
  }, [jobs, currentIndex]);

  const isDeckEmpty = useMemo(() => {
    return currentIndex >= jobs.length;
  }, [currentIndex, jobs.length]);

  const canUndo = useMemo(() => {
    return swipedHistory.length > 0 && currentIndex > 0;
  }, [swipedHistory.length, currentIndex]);

  /**
   * recordSwipe:
   * Isolated swipe side-effect.
   * On Day 3, replace the internal body with `await ApiService.postSwipe({ job_id: String(jobId), direction })`
   */
  const recordSwipe = useCallback(async (jobId: string | number, direction: 'right' | 'left') => {
    const job = jobs.find(j => String(j.job_id) === String(jobId)) || currentJob;
    if (!job) return;

    // Record to local swipe history stack for undo support
    const historyEntry: SwipedHistoryItem = {
      job,
      direction,
      swipedAt: new Date().toISOString()
    };

    setSwipedHistory(prev => [...prev, historyEntry]);
    setCurrentIndex(prev => prev + 1);

    // Optional: Log or trigger analytics/mock event
    console.debug(`[useJobFeed] Recorded swipe: Job ${jobId} -> ${direction}`);
  }, [jobs, currentJob]);

  /**
   * undoLastSwipe:
   * Reverts the most recent swipe action and restores previous card.
   */
  const undoLastSwipe = useCallback(async (): Promise<Job | null> => {
    if (swipedHistory.length === 0 || currentIndex <= 0) return null;

    const lastEntry = swipedHistory[swipedHistory.length - 1];
    setSwipedHistory(prev => prev.slice(0, -1));
    setCurrentIndex(prev => Math.max(0, prev - 1));

    console.debug(`[useJobFeed] Undid swipe on Job ${lastEntry.job.job_id}`);
    return lastEntry.job;
  }, [swipedHistory, currentIndex]);

  /**
   * resetDeck:
   * Restores the deck to the beginning.
   */
  const resetDeck = useCallback(() => {
    setCurrentIndex(0);
    setSwipedHistory([]);
  }, []);

  return {
    jobs,
    currentJob,
    nextJob,
    currentIndex,
    isDeckEmpty,
    canUndo,
    swipedHistory,
    recordSwipe,
    undoLastSwipe,
    resetDeck
  };
}
