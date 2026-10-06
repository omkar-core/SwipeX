import React, { useState, useId } from 'react';

export interface DataPoint {
  date: string;
  count: number;
  secondaryCount?: number;
}

export interface LineAreaChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  unit?: string;
  ariaLabel?: string;
}

export const LineAreaChart: React.FC<LineAreaChartProps> = ({
  data,
  height = 220,
  color = '#2563EB',
  gradientFrom = 'rgba(37, 99, 235, 0.35)',
  gradientTo = 'rgba(37, 99, 235, 0.0)',
  unit = 'jobs',
  ariaLabel = 'Job posting trend line chart',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const rawId = useId();
  const gradId = `line-area-grad-${rawId.replace(/:/g, '')}`;

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400 font-medium">
        No trend data available for this range
      </div>
    );
  }

  const padding = { top: 24, right: 24, bottom: 32, left: 40 };
  const width = 600;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.count), 10);
  const minVal = 0;
  const valRange = maxVal - minVal || 1;

  const points = data.map((d, idx) => {
    const x = padding.left + (idx / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.count - minVal) / valRange) * chartHeight;
    return { x, y, ...d };
  });

  // Build SVG path
  const linePath = points.reduce((acc, p, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padding.top + chartHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padding.top + chartHeight).toFixed(1)} Z`;

  // 4 horizontal grid lines
  const gridLines = [0, 0.33, 0.66, 1].map((pct) => {
    const y = padding.top + chartHeight * (1 - pct);
    const val = Math.round(minVal + pct * valRange);
    return { y, val };
  });

  return (
    <div className="relative w-full overflow-hidden select-none" data-testid="line-area-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>

        {/* Grid Lines & Y-Axis Labels */}
        {gridLines.map((gl, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={gl.y}
              x2={width - padding.right}
              y2={gl.y}
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={gl.y + 3.5}
              textAnchor="end"
              className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500"
            >
              {gl.val}
            </text>
          </g>
        ))}

        {/* Shaded Area */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line Stroke */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data Points and Interaction Circles */}
        {points.map((p, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g key={idx} className="cursor-pointer">
              {/* Invisible touch/hover target */}
              <circle
                cx={p.x}
                cy={p.y}
                r="14"
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {/* Visible dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? '5' : '3.5'}
                fill={color}
                stroke="#ffffff"
                strokeWidth={isHovered ? '2' : '1.5'}
                className="transition-all duration-150"
              />
              {/* X-Axis Date label */}
              {(data.length <= 10 || idx % Math.ceil(data.length / 7) === 0 || idx === data.length - 1) && (
                <text
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500"
                >
                  {p.date}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="absolute pointer-events-none z-20 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-700/60 backdrop-blur-xs transform -translate-x-1/2 -translate-y-full mb-2"
          style={{
            left: `${(points[hoveredIdx].x / width) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100}%`,
          }}
        >
          <div className="font-bold text-[11px] text-slate-300">{points[hoveredIdx].date}</div>
          <div className="text-xs font-black text-blue-400">
            {points[hoveredIdx].count.toLocaleString()} {unit}
          </div>
        </div>
      )}
    </div>
  );
};
