import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Star, 
  Trash2, 
  Eye, 
  Clock, 
  Sparkles, 
  AlertTriangle,
  RefreshCw,
  Award,
  RotateCcw
} from 'lucide-react';
import { ResumeVersion } from '../../types';
import { useResume } from '../../context/ResumeContext';

interface ResumeVersionsListProps {
  onSelectVersion?: (version: ResumeVersion) => void;
}

export const ResumeVersionsList: React.FC<ResumeVersionsListProps> = ({ onSelectVersion }) => {
  const { 
    versions, 
    activeResumeId, 
    setActiveResumeId, 
    setDefaultResume, 
    deleteResumeVersion,
    parseResumeVariant,
    isLoadingVersions 
  } = useResume();

  const [parsingId, setParsingId] = useState<string | null>(null);

  const handleTriggerParse = async (resumeId: string) => {
    setParsingId(resumeId);
    try {
      await parseResumeVariant(resumeId);
    } finally {
      setParsingId(null);
    }
  };

  if (isLoadingVersions) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-subtle animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="space-y-3">
          <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
          <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-8 shadow-subtle text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">No Resume Versions Yet</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Upload your master resume above to enable multi-version tracking and ATS keyword scoring.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-subtle">
      {/* List Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Saved Resume Versions</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
              {versions.length} {versions.length === 1 ? 'Variant' : 'Variants'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            The active default version is used by default in the Job Swipe Deck.
          </p>
        </div>
      </div>

      {/* Versions List */}
      <div className="space-y-3.5">
        {versions.map((version) => {
          const isSelected = version.resume_id === activeResumeId;
          const isDefault = version.is_default;
          const isParsingThis = parsingId === version.resume_id;

          // Parse status badge helpers
          const isParsed = version.parse_status === 'parsed';
          const isPending = version.parse_status === 'pending' || version.parse_status === 'analyzing' || isParsingThis;
          const isFailed = version.parse_status === 'failed';

          const skillsCount = (version.extracted_skills || version.parsed_skills || []).length;

          const formattedDate = new Date(version.uploaded_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <div
              key={version.resume_id}
              onClick={() => {
                setActiveResumeId(version.resume_id);
                if (onSelectVersion) onSelectVersion(version);
              }}
              className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer ${
                isFailed
                  ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                  : isSelected
                  ? 'border-blue-500/80 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-500/50'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Left: Version Tag & File Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs ${
                    isDefault
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}>
                    v{version.version}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {version.version_label || version.filename}
                      </h4>

                      {/* Default Active Badge */}
                      {isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          ACTIVE DEFAULT
                        </span>
                      )}

                      {/* Parse Status Badge */}
                      {isParsed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Parsed ({skillsCount} skills)
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 animate-pulse">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          Analyzing...
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-300">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Parse Failed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span>{version.filename}</span>
                      <span>•</span>
                      <span>{version.file_size || '1.2 MB'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Parse Failure Banner with Retry Action */}
                    {isFailed && (
                      <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <span>{version.parse_error || 'Semantic extraction failed. Document structure was unreadable.'}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerParse(version.resume_id);
                          }}
                          className="font-bold underline hover:text-rose-800 cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry Parse</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Metrics & Action Buttons */}
                <div className="flex items-center gap-2 sm:gap-3 justify-end flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 flex-wrap">
                  {/* Fit Score Gauge Pill */}
                  {isParsed && (
                    <div className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-blue-500" />
                      <span>Fit: {version.overall_fit_score}/100</span>
                    </div>
                  )}

                  {/* Parse / Re-parse Action */}
                  {(!isParsed || isFailed) && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerParse(version.resume_id);
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} />
                      <span>{isFailed ? 'Retry Parse' : 'Parse Now'}</span>
                    </button>
                  )}

                  {/* Set as Default Button */}
                  {!isDefault && isParsed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDefaultResume(version.resume_id);
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Set Default
                    </button>
                  )}

                  {/* View Skills Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveResumeId(version.resume_id);
                      if (onSelectVersion) onSelectVersion(version);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>{isSelected ? 'Viewing' : 'Inspect'}</span>
                  </button>

                  {/* Delete Button (disabled if only 1 version) */}
                  {versions.length > 1 && (
                    <button
                      type="button"
                      aria-label="Delete this resume version"
                      title="Delete version"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete Version v${version.version} (${version.filename})?`)) {
                          deleteResumeVersion(version.resume_id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
