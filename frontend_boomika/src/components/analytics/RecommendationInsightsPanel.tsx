import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Building2, Lightbulb, ArrowUpRight } from 'lucide-react';
import { RecommendationInsight } from '../../types/milestone4';
import { ApiService } from '../../services/api';
import { AiMatchBadge } from '../discover/AiMatchBadge';

interface RecommendationInsightsPanelProps {
  onNavigateToJob?: (jobId: string | number) => void;
}

export const RecommendationInsightsPanel: React.FC<RecommendationInsightsPanelProps> = ({
  onNavigateToJob,
}) => {
  const [insights, setInsights] = useState<RecommendationInsight[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    ApiService.getRecommendationInsights()
      .then((data) => {
        if (isMounted) setInsights(data);
      })
      .catch((err) => console.warn('Failed to load recommendation insights:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              AI Recommendation Rationale
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Explainable neural match criteria tailored to your uploaded resume and swipe history.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-4 animate-pulse">
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.job_id}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-400/60 dark:hover:border-indigo-500/50 transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{insight.company}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white pt-0.5">
                    {insight.title}
                  </h4>
                </div>
                <AiMatchBadge match_percentage={insight.match_percentage} size="sm" />
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  Why you were matched
                </span>
                <ul className="space-y-1">
                  {insight.reasons.map((reason, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {onNavigateToJob && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => onNavigateToJob(insight.job_id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <span>View Role</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
