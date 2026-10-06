import React, { useState } from 'react';

export interface StackedPoint {
  date: string;
  startup: number;
  mnc: number;
}

export interface StackedBarChartProps {
  data: StackedPoint[];
  height?: number;
  ariaLabel?: string;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  data,
  height = 220,
  ariaLabel = 'Startup vs Enterprise hiring activity chart',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400 font-medium">
        No segment distribution data available
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 32, left: 36 };
  const width = 600;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxTotal = Math.max(...data.map((d) => d.startup + d.mnc), 20);

  const barWidth = Math.min(Math.max((chartWidth / data.length) * 0.55, 12), 48);

  return (
    <div className="relative w-full select-none" data-testid="stacked-bar-chart">
      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mb-3 text-xs font-bold">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-xs bg-purple-600 dark:bg-purple-500" />
          <span className="text-slate-700 dark:text-slate-300">Startups & Scaleups</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-xs bg-blue-600 dark:bg-blue-500" />
          <span className="text-slate-700 dark:text-slate-300">Enterprise / MNCs</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Horizontal Guide Lines */}
        {[0, 0.5, 1].map((pct) => {
          const y = padding.top + chartHeight * (1 - pct);
          const val = Math.round(maxTotal * pct);
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 6}
                y={y + 3.5}
                textAnchor="end"
                className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Stacked Bars */}
        {data.map((d, idx) => {
          const slotWidth = chartWidth / data.length;
          const x = padding.left + idx * slotWidth + (slotWidth - barWidth) / 2;
          const total = d.startup + d.mnc;
          const totalHeight = (total / maxTotal) * chartHeight;
          const startupHeight = (d.startup / maxTotal) * chartHeight;
          const mncHeight = (d.mnc / maxTotal) * chartHeight;

          const mncY = padding.top + chartHeight - mncHeight;
          const startupY = mncY - startupHeight;

          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={idx}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Invisible touch column */}
              <rect
                x={padding.left + idx * slotWidth}
                y={padding.top}
                width={slotWidth}
                height={chartHeight}
                fill="transparent"
              />

              {/* Startup Segment (Top) */}
              <rect
                x={x}
                y={startupY}
                width={barWidth}
                height={startupHeight}
                rx={d.mnc === 0 ? 3 : 0}
                className="fill-purple-600 dark:fill-purple-500 transition-all duration-200"
                opacity={hoveredIdx !== null && !isHovered ? 0.6 : 1}
              />

              {/* MNC Segment (Bottom) */}
              <rect
                x={x}
                y={mncY}
                width={barWidth}
                height={mncHeight}
                rx={0}
                className="fill-blue-600 dark:fill-blue-500 transition-all duration-200"
                opacity={hoveredIdx !== null && !isHovered ? 0.6 : 1}
              />

              {/* X-Axis Date label */}
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                className={`text-[10px] font-medium transition-colors ${
                  isHovered
                    ? 'fill-slate-900 dark:fill-white font-bold'
                    : 'fill-slate-400 dark:fill-slate-500'
                }`}
              >
                {d.date}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover Floating Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute pointer-events-none z-20 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs p-2.5 rounded-xl shadow-xl border border-slate-700/60 backdrop-blur-xs transform -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${
              ((padding.left + hoveredIdx * (chartWidth / data.length) + (chartWidth / data.length) / 2) /
                width) *
              100
            }%`,
            top: '40%',
          }}
        >
          <div className="font-bold text-[11px] text-slate-300 pb-1 border-b border-slate-700/60">
            {data[hoveredIdx].date}
          </div>
          <div className="space-y-1 pt-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-3 text-purple-300 font-semibold">
              <span>Startups:</span>
              <span className="font-black text-white">{data[hoveredIdx].startup}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-blue-300 font-semibold">
              <span>Enterprise:</span>
              <span className="font-black text-white">{data[hoveredIdx].mnc}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-400 font-bold pt-1 border-t border-slate-700/60 text-[10px]">
              <span>Startup Share:</span>
              <span className="text-emerald-400">
                {Math.round(
                  (data[hoveredIdx].startup / (data[hoveredIdx].startup + data[hoveredIdx].mnc || 1)) * 100
                )}
                %
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
