import React from 'react';
import { CheckCircle2, Circle, GitBranch, FileText, Link, Star, ArrowRight } from 'lucide-react';
import { useResume } from '../../context/ResumeContext';

import { useAuth } from '../../context/AuthContext';

interface ProfileStrengthMeterProps {
  onNavigateToResume: () => void;
  onOpenGitHub?: () => void;
}

interface StrengthItem {
  id: string;
  label: string;
  description: string;
  boost: number;
  icon: React.ReactNode;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

/**
 * Feature 5 — Profile Strength Meter
 * Multi-segment progress bar in Applications sidebar.
 * Tracks resume upload, skills, GitHub, portfolio, and tailored summary.
 * Each incomplete item is clickable to navigate to the fix.
 */
export const ProfileStrengthMeter: React.FC<ProfileStrengthMeterProps> = ({
  onNavigateToResume,
}) => {
  const { resume } = useResume();
  const { user } = useAuth();

  const hasResume = resume.status === 'parsed';
  const hasSkills = (user?.skills?.length ?? 0) >= 3;
  // These could be connected to real user profile data in a real implementation
  const hasGitHub = false;
  const hasPortfolio = false;
  const hasTailoredSummary = false;

  const items: StrengthItem[] = [
    {
      id: 'resume',
      label: 'Resume Uploaded',
      description: 'Foundation of your profile',
      boost: 30,
      icon: <FileText className="w-3.5 h-3.5" />,
      completed: hasResume,
      action: onNavigateToResume,
      actionLabel: 'Upload',
    },
    {
      id: 'skills',
      label: 'Skills Listed',
      description: 'Improves ATS matching',
      boost: 20,
      icon: <Star className="w-3.5 h-3.5" />,
      completed: hasSkills,
      action: onNavigateToResume,
      actionLabel: 'Add skills',
    },
    {
      id: 'github',
      label: 'GitHub Linked',
      description: 'Boosts dev role match +15%',
      boost: 15,
      icon: <GitBranch className="w-3.5 h-3.5" />,
      completed: hasGitHub,
      actionLabel: 'Link GitHub',
    },

    {
      id: 'portfolio',
      label: 'Portfolio URL',
      description: 'Essential for design roles',
      boost: 10,
      icon: <Link className="w-3.5 h-3.5" />,
      completed: hasPortfolio,
      actionLabel: 'Add URL',
    },
    {
      id: 'summary',
      label: 'Tailored Summary',
      description: 'For Product Designer roles',
      boost: 8,
      icon: <FileText className="w-3.5 h-3.5" />,
      completed: hasTailoredSummary,
      action: onNavigateToResume,
      actionLabel: 'Tailor it',
    },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const totalBoost = items.filter(i => i.completed).reduce((sum, i) => sum + i.boost, 0);
  const maxBoost = items.reduce((sum, i) => sum + i.boost, 0);
  const strengthPct = Math.round((totalBoost / maxBoost) * 100);

  const strengthLabel =
    strengthPct >= 90 ? 'Elite' :
    strengthPct >= 70 ? 'Strong' :
    strengthPct >= 50 ? 'Good' :
    strengthPct >= 30 ? 'Building' : 'Starter';

  const strengthColor =
    strengthPct >= 90 ? 'text-green-600 dark:text-green-400' :
    strengthPct >= 70 ? 'text-blue-600 dark:text-blue-400' :
    strengthPct >= 50 ? 'text-amber-500 dark:text-amber-400' :
    'text-slate-500 dark:text-slate-400';

  const barColor =
    strengthPct >= 90 ? '#22c55e' :
    strengthPct >= 70 ? '#2563EB' :
    strengthPct >= 50 ? '#f59e0b' :
    '#94a3b8';

  return (
    <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-subtle">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Profile Strength
        </h3>
        <span className={`text-xs font-extrabold ${strengthColor}`}>
          {strengthLabel}
        </span>
      </div>

      {/* Progress Bar — multi-segment */}
      <div className="relative h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${strengthPct}%`, backgroundColor: barColor }}
        />
        {/* Segment markers */}
        {items.slice(0, -1).map((_, i) => {
          const pos = ((i + 1) / items.length) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-white/60 dark:bg-slate-800/60"
              style={{ left: `${pos}%` }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-4">
        <span>{completedCount}/{items.length} completed</span>
        <span className="font-semibold">{strengthPct}%</span>
      </div>

      {/* Items list */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors ${
              item.completed
                ? 'opacity-70'
                : item.action
                ? 'hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer group'
                : 'cursor-default'
            }`}
            onClick={!item.completed && item.action ? item.action : undefined}
          >
            {/* Status icon */}
            <div className={`mt-0.5 flex-shrink-0 ${item.completed ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'}`}>
              {item.completed ? (
                <CheckCircle2 className="w-4 h-4 fill-green-500 text-white" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>

            {/* Label + description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className={`text-xs font-semibold ${item.completed ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'}`}>
                  {item.label}
                </span>
                {!item.completed && (
                  <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 ml-auto">
                    +{item.boost}%
                  </span>
                )}
              </div>
              {!item.completed && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{item.description}</p>
              )}
            </div>

            {/* Action arrow */}
            {!item.completed && item.action && (
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
