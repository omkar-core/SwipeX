import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, DollarSign, X, Heart, Box, Flame, ArrowLeftRight } from 'lucide-react';
import { Job } from '../../types';
import { getJobImage } from '../../utils/getJobImage';
import { AiMatchBadge } from './AiMatchBadge';
import { CompetitionBadge } from './CompetitionBadge';
import { PostedTimeLabel } from './PostedTimeLabel';
import { EarlyApplicantBadge } from './EarlyApplicantBadge';

interface SwipeCardProps {
  job: Job;
  match_percentage?: number;
  onSwipe: (direction: 'left' | 'right') => void;
  onSave: () => void;
  onPass: () => void;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({ job, match_percentage, onSwipe, onSave, onPass }) => {
  const [exitX, setExitX] = useState<number | null>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-16, 16]);
  const opacity = useTransform(x, [-250, -100, 0, 100, 250], [0.4, 1, 1, 1, 0.4]);
  
  // Visual indicators while dragging
  const likeOpacity = useTransform(x, [10, 100], [0, 1]);
  const passOpacity = useTransform(x, [-10, -100], [0, 1]);

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 90) {
      setExitX(400);
      setTimeout(() => onSwipe('right'), 120);
    } else if (info.offset.x < -90) {
      setExitX(-400);
      setTimeout(() => onSwipe('left'), 120);
    }
  };

  const handleManualPass = () => {
    setExitX(-400);
    setTimeout(() => onPass(), 150);
  };

  const handleManualSave = () => {
    setExitX(400);
    setTimeout(() => onSave(), 150);
  };

  const displaySkills = job.skills_required && job.skills_required.length > 0 
    ? job.skills_required 
    : (job.skills || job.tags || ['Design', 'Technology', 'Product']);

  const effectiveMatchScore = match_percentage ?? job.match_score ?? job.ats_match_score;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={exitX !== null ? { x: exitX, opacity: 0, scale: 0.92 } : { x: 0, opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65}
      onDragEnd={handleDragEnd}
      className="w-full bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
    >
      {/* Dynamic Drag Overlays */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-6 right-6 z-20 bg-[#2563EB] text-white font-extrabold px-4 py-1.5 rounded-lg border-2 border-white shadow-md text-sm uppercase tracking-wider flex items-center gap-1.5 pointer-events-none"
      >
        <Heart className="w-4 h-4 fill-white" /> SAVE
      </motion.div>

      <motion.div
        style={{ opacity: passOpacity }}
        className="absolute top-6 left-6 z-20 bg-slate-800 dark:bg-slate-700 text-white font-extrabold px-4 py-1.5 rounded-lg border-2 border-white shadow-md text-sm uppercase tracking-wider flex items-center gap-1.5 pointer-events-none"
      >
        <X className="w-4 h-4" /> PASS
      </motion.div>

      {/* Banner Image */}
      <div className="h-48 sm:h-56 w-full relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img
          src={job.banner_image || getJobImage(job.title, job.skills_required ?? job.skills)}
          alt={job.title}
          className="w-full h-full object-cover pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 dark:from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Floating Top Indicators on SwipeCard */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PostedTimeLabel posted_at={job.posted_at} />
            <EarlyApplicantBadge job={job} size="sm" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 sm:p-7 relative pt-5">
        {/* Floating Brand Badge & Hot Match Tag / AI Match % */}
        <div className="absolute -top-7 left-6 right-6 flex items-end justify-between pointer-events-none">
          <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center p-2">
            <div className="w-full h-full bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-extrabold text-lg">
              {job.company ? job.company.charAt(0) : <Box className="w-6 h-6" />}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <AiMatchBadge match_percentage={effectiveMatchScore} />
            {job.is_hot_match && (
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-white" />
                <span>Hot Match</span>
              </div>
            )}
          </div>
        </div>

        {/* Title & Company */}
        <div className="pt-5">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            {job.title}
          </h2>
          <div className="text-base font-bold text-[#2563EB] dark:text-blue-400 mt-0.5">
            {job.company}
          </div>
        </div>

        {/* Meta Chips (Location, Salary & Competition Badge) */}
        <div className="flex flex-wrap items-center gap-2 mt-3.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F1F5F9] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{job.location}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F1F5F9] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300">
            <DollarSign className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{job.salary_range}</span>
          </div>

          <CompetitionBadge job={job} size="sm" />
        </div>

        {/* Job Description */}
        <p className="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 font-normal">
          {job.description}
        </p>

        {/* Skills Required Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {displaySkills.map((skill, idx) => (
            <span
              key={idx}
              className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                idx === 0
                  ? 'bg-blue-50/80 dark:bg-blue-900/20 text-[#2563EB] dark:text-blue-400 border-blue-200 dark:border-blue-800/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Bottom Action Row */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {/* Pass Button */}
          <button
            type="button"
            onClick={handleManualPass}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-subtle cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Pass</span>
          </button>

          {/* Swipe to Decide Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Swipe to Decide</span>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleManualSave}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white rounded-md text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <span>Save</span>
            <Heart className="w-4 h-4 fill-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
