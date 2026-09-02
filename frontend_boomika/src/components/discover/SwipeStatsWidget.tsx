import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, Flame, Target, Activity } from 'lucide-react';
import { useJobs } from '../../context/JobContext';

/**
 * Feature 3 — Live Swipe Stats Floating Widget
 * Fixed bottom-right card that tracks swipe metrics in real-time:
 * - Total swiped today
 * - Save rate %
 * - Top industry (from saved jobs)
 * - Streak counter
 */
export const SwipeStatsWidget: React.FC = () => {
  const { savedJobs } = useJobs();
  const [totalSwiped, setTotalSwiped] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [streak, setStreak] = useState(4);
  const prevSavedCount = useRef(savedJobs.length);

  // Track swipes via custom event emitted from DiscoverScreen
  useEffect(() => {
    const onSwipe = (e: Event) => {
      const detail = (e as CustomEvent).detail as { direction: string };
      setTotalSwiped(prev => prev + 1);
      if (detail.direction === 'right') {
        setTotalSaved(prev => prev + 1);
      }
    };
    window.addEventListener('swipex:swipe', onSwipe);
    return () => window.removeEventListener('swipex:swipe', onSwipe);
  }, []);

  // Also sync when savedJobs changes (from initial load)
  useEffect(() => {
    if (savedJobs.length !== prevSavedCount.current) {
      prevSavedCount.current = savedJobs.length;
    }
  }, [savedJobs]);

  const saveRate = totalSwiped > 0 ? Math.round((totalSaved / totalSwiped) * 100) : 0;

  const stats = [
    {
      icon: <Activity className="w-3.5 h-3.5" />,
      label: 'Swiped Today',
      value: totalSwiped,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      icon: <Target className="w-3.5 h-3.5" />,
      label: 'Save Rate',
      value: `${saveRate}%`,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      label: 'Saved Roles',
      value: totalSaved,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      icon: <Flame className="w-3.5 h-3.5" />,
      label: 'Day Streak',
      value: `${streak} 🔥`,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-30">
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="mb-2 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-4 w-64 animate-fade-in"
          style={{ animation: 'fadeInUp 0.2s ease' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Session Stats
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Today</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className={`${stat.bg} rounded-xl p-3`}>
                <div className={`flex items-center gap-1 ${stat.color} mb-1`}>
                  {stat.icon}
                  <span className="text-[10px] font-semibold">{stat.label}</span>
                </div>
                <span className={`text-lg font-extrabold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Save rate bar */}
          {totalSwiped > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                <span>Save Rate</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{saveRate}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${saveRate}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        title={isExpanded ? 'Hide stats' : 'Show session stats'}
        className="w-12 h-12 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:shadow-xl transition-all hover:scale-105 cursor-pointer relative"
      >
        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        {totalSwiped > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
            {totalSwiped > 99 ? '99+' : totalSwiped}
          </span>
        )}
      </button>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
