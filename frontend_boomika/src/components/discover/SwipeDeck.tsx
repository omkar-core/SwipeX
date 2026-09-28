import React, { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { Heart, X, RotateCcw, CheckCircle2, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { Job } from '../../types';
import { JobCard } from './JobCard';

export interface SwipeDeckProps {
  jobs: Job[];
  currentIndex: number;
  currentJob: Job | null;
  nextJob: Job | null;
  canUndo: boolean;
  onSwipe: (jobId: string | number, direction: 'right' | 'left') => Promise<void>;
  onUndo: () => Promise<Job | null>;
  onReset: () => void;
  onViewDetails?: (job: Job) => void;
}

/**
 * SwipeDeck Component
 * Framer Motion GPU-accelerated gesture engine for SwipeX.
 * 
 * Features:
 * - 60fps horizontal drag + 3D rotation transform
 * - Proportional SAVE / PASS stamp overlay fading
 * - Shared commitSwipe() handler for drag, button triggers, and keyboard shortcuts
 * - Smooth undo restoration animation
 * - Multi-card stack depth visualization
 */
export const SwipeDeck: React.FC<SwipeDeckProps> = ({
  jobs,
  currentIndex,
  currentJob,
  nextJob,
  canUndo,
  onSwipe,
  onUndo,
  onReset,
  onViewDetails,
}) => {
  // Motion values for drag on active top card
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-15, 15]);
  const cardScale = useTransform(x, [-200, 0, 200], [0.96, 1, 0.96]);

  // Dynamic stamp overlay opacities & scale
  const saveStampOpacity = useTransform(x, [20, 110], [0, 1]);
  const saveStampScale = useTransform(x, [20, 110], [0.8, 1.05]);

  const passStampOpacity = useTransform(x, [-20, -110], [0, 1]);
  const passStampScale = useTransform(x, [-20, -110], [0.8, 1.05]);

  // Track programmatic exit animation coordinate
  const [exitX, setExitX] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  /**
   * Shared commitSwipe function
   * Used by drag release, button clicks, and keyboard shortcuts.
   */
  const commitSwipe = useCallback(async (direction: 'right' | 'left') => {
    if (!currentJob || isSwiping) return;

    setIsSwiping(true);
    const targetX = direction === 'right' ? 500 : -500;
    setExitX(targetX);

    // Allow exit animation to play before updating state
    setTimeout(async () => {
      await onSwipe(currentJob.job_id, direction);
      setExitX(null);
      x.set(0);
      setIsSwiping(false);
    }, 180);
  }, [currentJob, isSwiping, onSwipe, x]);

  // Drag end gesture handler
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isSwiping) return;

    const threshold = 85;
    if (info.offset.x > threshold) {
      commitSwipe('right');
    } else if (info.offset.x < -threshold) {
      commitSwipe('left');
    } else {
      // Snap back to center
      x.set(0);
    }
  };

  // Keyboard navigation listener (ArrowLeft = Pass, ArrowRight = Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid capturing arrows if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        commitSwipe('right');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        commitSwipe('left');
      } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (canUndo) onUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commitSwipe, canUndo, onUndo]);

  // Handle Undo with reset of motion values
  const handleUndo = async () => {
    if (!canUndo || isSwiping) return;
    setExitX(null);
    x.set(0);
    await onUndo();
  };

  // Empty deck view
  if (!currentJob) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 shadow-xl text-center flex flex-col items-center justify-center min-h-[460px]">
        <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          You're All Caught Up!
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
          You have reviewed all available jobs in this feed. Check back soon for fresh postings or adjust your discovery filters.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Mock Deck</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Swipeable Card Stack Container */}
      <div className="relative w-full min-h-[580px] sm:min-h-[620px] flex items-center justify-center">
        
        {/* Background Underneath Card (Stack Depth Visual) */}
        {nextJob && (
          <div 
            className="absolute inset-x-3 top-4 bottom-0 z-0 pointer-events-none transition-all duration-300 transform scale-[0.96] opacity-60 dark:opacity-40"
            aria-hidden="true"
          >
            <JobCard job={nextJob} showControls={false} />
          </div>
        )}

        {/* Foreground Active Swipeable Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentJob.job_id}
            style={{ 
              x, 
              rotate, 
              scale: cardScale,
              zIndex: 10 
            }}
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={
              exitX !== null 
                ? { x: exitX, opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: 'easeIn' } } 
                : { x: 0, opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
            }
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            className="w-full relative cursor-grab active:cursor-grabbing touch-pan-y"
          >
            {/* Dynamic Real-Time SAVE / APPLY Stamp Overlay */}
            <motion.div
              style={{ opacity: saveStampOpacity, scale: saveStampScale }}
              className="absolute top-8 right-8 z-30 pointer-events-none bg-emerald-600 text-white font-black text-sm tracking-wider px-4 py-2 rounded-xl shadow-2xl border-2 border-white flex items-center gap-1.5 uppercase rotate-12"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>SAVE & APPLY</span>
            </motion.div>

            {/* Dynamic Real-Time PASS Stamp Overlay */}
            <motion.div
              style={{ opacity: passStampOpacity, scale: passStampScale }}
              className="absolute top-8 left-8 z-30 pointer-events-none bg-rose-600 text-white font-black text-sm tracking-wider px-4 py-2 rounded-xl shadow-2xl border-2 border-white flex items-center gap-1.5 uppercase -rotate-12"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>PASS</span>
            </motion.div>

            {/* Main Job Card Component */}
            <JobCard
              job={currentJob}
              onPass={() => commitSwipe('left')}
              onSave={() => commitSwipe('right')}
              onUndo={handleUndo}
              canUndo={canUndo}
              onViewDetails={onViewDetails}
              isCurrent={true}
              showControls={true}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Keyboard Shortcut Hint Bar */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
            ←
          </kbd>
          <span>Pass</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
            →
          </kbd>
          <span>Save / Apply</span>
        </div>
      </div>
    </div>
  );
};
