import React from 'react';
import { Clock } from 'lucide-react';
import { getPostedLabel } from '../../utils/competition';

export interface PostedTimeLabelProps {
  posted_at?: string | null;
  className?: string;
  showIcon?: boolean;
}

export const PostedTimeLabel: React.FC<PostedTimeLabelProps> = ({
  posted_at,
  className = '',
  showIcon = true,
}) => {
  const label = getPostedLabel(posted_at);

  const isVeryRecent = label === 'Just now' || label.endsWith('h ago') || label === '1d ago';

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-2.5 py-1 backdrop-blur-xs shadow-2xs ${
        isVeryRecent
          ? 'bg-emerald-500/90 text-white border border-emerald-400/40'
          : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60'
      } ${className}`}
      data-testid="posted-time-label"
    >
      {showIcon && <Clock className="w-3 h-3 opacity-90" />}
      <span>{label}</span>
    </span>
  );
};
