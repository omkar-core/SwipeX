import React, { useState, useEffect } from 'react';
import { Heart, X, Compass, Target, ArrowRight, Zap } from 'lucide-react';
import { SwipeBehaviorSummary as ISwipeBehaviorSummary } from '../../types/milestone4';
import { ApiService } from '../../services/api';

export const SwipeBehaviorSummary: React.FC = () => {
  const [data, setData] = useState<ISwipeBehaviorSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    ApiService.getSwipeBehaviorSummary()
      .then((summary) => {
        if (isMounted) setData(summary);
      })
      .catch((err) => console.warn('Failed to load swipe summary:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs animate-pulse">
        <div className="h-6 w-48 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const rightPct = Math.round(data.right_swipe_ratio * 100);
  const leftPct = 100 - rightPct;

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Swipe Discovery Dynamics
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Interaction distribution and preferences learned by the neural matching engine.
            </p>
          </div>
        </div>
      </div>

      {/* Swipe Ratio Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
            {data.right_swipes} Liked / Applied ({rightPct}%)
          </span>
          <span className="text-slate-400 flex items-center gap-1">
            <X className="w-3.5 h-3.5" />
            {data.left_swipes} Passed ({leftPct}%)
          </span>
        </div>
        
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${rightPct}%` }}
            title={`${rightPct}% Right Swipes`}
          />
          <div
            className="h-full bg-slate-300 dark:bg-slate-700 transition-all duration-500"
            style={{ width: `${leftPct}%` }}
            title={`${leftPct}% Left Swipes`}
          />
        </div>
      </div>

      {/* Preference Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-blue-500" />
            Primary Domain Focus
          </span>
          <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
            {data.top_industry}
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            Avg Match of Saved Roles
          </span>
          <div className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
            {data.avg_saved_match}% Compatibility
          </div>
        </div>
      </div>
    </div>
  );
};
