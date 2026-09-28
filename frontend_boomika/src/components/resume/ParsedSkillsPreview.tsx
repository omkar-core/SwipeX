import React, { useState } from 'react';
import { Sparkles, Plus, X, Tag, Check, Award, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import { useResume } from '../../context/ResumeContext';

export const ParsedSkillsPreview: React.FC = () => {
  const { activeResume, updateSkills, parseResumeVariant } = useResume();
  const [newSkillText, setNewSkillText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  if (!activeResume) {
    return null;
  }

  const skills = activeResume.extracted_skills || activeResume.parsed_skills || [];
  const isFailed = activeResume.parse_status === 'failed';
  const isAnalyzing = activeResume.parse_status === 'analyzing' || activeResume.parse_status === 'pending' || isParsing;

  const handleRetryParse = async () => {
    setIsParsing(true);
    try {
      await parseResumeVariant(activeResume.resume_id);
    } finally {
      setIsParsing(false);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updated = skills.filter(s => s !== skillToRemove);
    updateSkills(activeResume.resume_id, updated);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkillText.trim();
    if (!trimmed) return;

    if (!skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...skills, trimmed];
      updateSkills(activeResume.resume_id, updated);
    }
    setNewSkillText('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-subtle">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              v{activeResume.version} Extracted Taxonomy
            </span>
            <span className="text-xs text-slate-400 font-semibold">•</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {activeResume.target_track || 'Senior Technical Track'}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
            Parsed Skills & Competencies ({skills.length} Extracted)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {!isFailed && !isAnalyzing && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>Fit Score: {activeResume.overall_fit_score}/100</span>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-700 dark:text-amber-300 text-xs font-bold animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Document...</span>
            </div>
          )}
        </div>
      </div>

      {/* Parse Failure State */}
      {isFailed && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">Parsing Incomplete or Failed</p>
              <p className="mt-0.5">{activeResume.parse_error || 'Automatic NLP extraction could not process this document format.'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetryParse}
            disabled={isParsing}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
            <span>{isParsing ? 'Reparsing...' : 'Retry Semantic Parse'}</span>
          </button>
        </div>
      )}

      {/* Categorized or Flat Skills Chips */}
      {skills.length > 0 ? (
        activeResume.skill_categories && activeResume.skill_categories.length > 0 ? (
          <div className="space-y-4">
            {activeResume.skill_categories.map((cat, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {cat.category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {cat.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 shadow-xs"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${skill}`}
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-blue-400 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 shadow-xs"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  aria-label={`Remove ${skill}`}
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-blue-400 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-6 text-xs text-slate-400">
          No skills extracted yet for this version. Trigger parsing or add custom tags below.
        </div>
      )}

      {/* Add Custom Skill Form */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {isAdding ? (
          <form onSubmit={handleAddSkill} className="flex items-center gap-2 flex-1">
            <input
              type="text"
              autoFocus
              value={newSkillText}
              onChange={(e) => setNewSkillText(e.target.value)}
              placeholder="Enter skill name (e.g. Docker, Web Vitals, Kubernetes)..."
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Skill Tag</span>
          </button>
        )}
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          * Skill tags/removals are local session edits
        </span>
      </div>
    </div>
  );
};
