import React from 'react';

export interface BarItem {
  skill: string;
  count: number;
  percentage?: number;
}

export interface HorizontalBarChartProps {
  items: BarItem[];
  maxCount?: number;
  barColor?: string;
  ariaLabel?: string;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  items,
  maxCount,
  barColor = 'bg-blue-600 dark:bg-blue-500',
  ariaLabel = 'Top in-demand technical skills bar chart',
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400 font-medium">
        No skill demand data available
      </div>
    );
  }

  const effectiveMax = maxCount || Math.max(...items.map((i) => i.count), 1);

  return (
    <div
      className="space-y-3 select-none"
      role="region"
      aria-label={ariaLabel}
      data-testid="horizontal-bar-chart"
    >
      {items.map((item, idx) => {
        const pct = Math.min(Math.round((item.count / effectiveMax) * 100), 100);
        return (
          <div key={item.skill || idx} className="space-y-1 group">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[200px] sm:max-w-[280px]">
                {item.skill}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-extrabold text-slate-900 dark:text-white">
                  {item.count.toLocaleString()} postings
                </span>
                {item.percentage !== undefined && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {item.percentage}%
                  </span>
                )}
              </div>
            </div>

            {/* Progress Track */}
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pct}%` }}
                title={`${item.skill}: ${item.count} mentions (${pct}% of top)`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
