import React from 'react';

interface MatchRingProps {
  score: number;
  size?: 'sm' | 'md';
}

/**
 * Feature 1 — Smart Match Score Ring
 * Animated ring that shows job-candidate match score with color-coded tiers:
 * ≥85% → green "Hot Match"
 * 70-84% → amber "Good Fit"
 * <70% → slate "Stretch Role"
 */
export const MatchRing: React.FC<MatchRingProps> = ({ score, size = 'sm' }) => {
  const radius = size === 'sm' ? 18 : 24;
  const strokeWidth = size === 'sm' ? 3.5 : 4;
  const dimension = (radius + strokeWidth) * 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  const isHot = score >= 85;
  const isGood = score >= 70 && score < 85;

  const strokeColor = isHot ? '#22c55e' : isGood ? '#f59e0b' : '#94a3b8';
  const bgStroke = isHot ? '#dcfce7' : isGood ? '#fef3c7' : '#f1f5f9';
  const textColor = isHot ? 'text-green-600' : isGood ? 'text-amber-500' : 'text-slate-500';
  const bgBadge = isHot ? 'bg-green-50 border-green-200' : isGood ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200';
  const label = isHot ? '🔥 Hot Match' : isGood ? '✓ Good Fit' : '↗ Stretch';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg
          width={dimension}
          height={dimension}
          viewBox={`0 0 ${dimension} ${dimension}`}
          className="-rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={bgStroke}
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-extrabold leading-none ${textColor} ${size === 'sm' ? 'text-[11px]' : 'text-sm'}`}>
            {score}
          </span>
        </div>
      </div>
      {/* Label badge */}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${bgBadge} ${textColor} whitespace-nowrap`}>
        {label}
      </span>
    </div>
  );
};
