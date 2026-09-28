import React, { useState } from 'react';
import { Sparkles, Copy, Check, Lightbulb, TrendingUp } from 'lucide-react';
import { AISuggestionItem } from '../../types';
import { useToast } from '../../context/ToastContext';

export interface AiSuggestionsPanelProps {
  suggestions: AISuggestionItem[];
  isLoading?: boolean;
  targetCompany?: string;
  className?: string;
}

export const AiSuggestionsPanel: React.FC<AiSuggestionsPanelProps> = ({
  suggestions,
  isLoading = false,
  targetCompany = 'Target Employer',
  className = '',
}) => {
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied recommendation to clipboard`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-subtle space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Sparkles className="w-5 h-5" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            AI Resume Coaching Advice
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
          Free Heuristic / AI
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
        Tailored suggestions generated for <strong className="text-slate-900 dark:text-white font-bold">{targetCompany}</strong>:
      </p>

      {/* Loading state */}
      {isLoading && (
        <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Generating personalized coaching suggestions...</p>
        </div>
      )}

      {/* Suggestions List */}
      {!isLoading && suggestions.length > 0 && (
        <div className="space-y-3 pt-1">
          {suggestions.map((sug) => (
            <div
              key={sug.id}
              className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-600"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {sug.section}
                </span>
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{sug.estimated_score_boost}% Score Boost
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                {sug.title}
              </h4>

              {sug.current_text && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-through">
                  "{sug.current_text}"
                </div>
              )}

              <p className="text-xs text-slate-700 dark:text-slate-300 italic border-l-2 border-blue-500 pl-2.5 py-0.5 leading-relaxed bg-blue-50/40 dark:bg-blue-950/20 rounded-r-md">
                "{sug.recommended_text}"
              </p>

              {sug.reasoning && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Impact: </span>
                  {sug.reasoning}
                </p>
              )}

              {sug.keywords_added && sug.keywords_added.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Keywords:</span>
                  {sug.keywords_added.map((kw, kwIdx) => (
                    <span
                      key={kwIdx}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      +{kw}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => handleCopy(sug.recommended_text, sug.id)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer py-1"
                >
                  {copiedId === sug.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Recommendation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && suggestions.length === 0 && (
        <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center space-y-2">
          <Lightbulb className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No AI Suggestions Available Yet</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Select a job or resume version to generate custom wording optimizations.
          </p>
        </div>
      )}
    </div>
  );
};
