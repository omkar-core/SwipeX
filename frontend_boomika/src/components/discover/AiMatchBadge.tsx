import React from 'react';
import { Sparkles, TrendingUp, HelpCircle } from 'lucide-react';

export interface AiMatchBadgeProps {
  match_percentage?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

/**
 * AiMatchBadge Component
 * Milestone 3 AI Skill & Recommendation Match Percentage Badge.
 * 
 * Styling Rules:
 * - High Match (>= 80%): Emerald / Green theme with Sparkles icon (Interview Ready tier)
 * - Medium Match (60% - 79%): Amber / Yellow theme with TrendingUp icon
 * - Low Match (< 60%): Slate / Gray theme with HelpCircle icon
 * - Undefined / Null / NaN: Renders nothing (returns null)
 */
export const AiMatchBadge: React.FC<AiMatchBadgeProps> = ({
  match_percentage,
  className = '',
  size = 'md',
  showIcon = true,
}) => {
  if (
    match_percentage === undefined || 
    match_percentage === null || 
    typeof match_percentage !== 'number' || 
    isNaN(match_percentage)
  ) {
    return null;
  }

  // Handle decimal normalization if passed in 0-1 range (e.g. 0.92 -> 92)
  const score = match_percentage <= 1 && match_percentage > 0
    ? Math.round(match_percentage * 100)
    : Math.round(match_percentage);

  const isHigh = score >= 80;
  const isMedium = score >= 60 && score < 80;
  const isLow = score < 60;

  const range = isHigh ? 'high' : isMedium ? 'medium' : 'low';

  // Distinct styling by range
  const colorClasses = isHigh
    ? 'bg-emerald-500/95 dark:bg-emerald-950/90 text-white dark:text-emerald-300 border border-emerald-400/50 dark:border-emerald-700/80 shadow-sm backdrop-blur-md'
    : isMedium
    ? 'bg-amber-500/95 dark:bg-amber-950/90 text-white dark:text-amber-300 border border-amber-400/50 dark:border-amber-700/80 shadow-sm backdrop-blur-md'
    : 'bg-slate-700/95 dark:bg-slate-800/90 text-slate-100 dark:text-slate-300 border border-slate-600/50 dark:border-slate-700/80 shadow-sm backdrop-blur-md';

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5 gap-1 font-bold'
    : size === 'lg'
    ? 'text-sm px-3.5 py-1.5 gap-1.5 font-extrabold'
    : 'text-[11px] px-2.5 py-1 gap-1.5 font-extrabold';

  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <span
      data-testid="ai-match-badge"
      data-range={range}
      data-score={score}
      className={`inline-flex items-center rounded-md transition-all select-none ${colorClasses} ${sizeClasses} ${className}`}
      title={`AI Match: ${score}%`}
    >
      {showIcon && (
        <>
          {isHigh && <Sparkles className={`${iconSize} fill-white/30 text-white flex-shrink-0`} />}
          {isMedium && <TrendingUp className={`${iconSize} text-white flex-shrink-0`} />}
          {isLow && <HelpCircle className={`${iconSize} text-slate-300 flex-shrink-0`} />}
        </>
      )}
      <span>{score}% Match</span>
    </span>
  );
};
