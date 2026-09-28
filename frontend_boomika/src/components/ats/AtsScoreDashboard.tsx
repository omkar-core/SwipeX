import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Target, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Briefcase, 
  FileText, 
  Building2, 
  ArrowRight, 
  Copy, 
  Lightbulb, 
  Check, 
  RefreshCw,
  Award,
  Layers,
  Zap,
  Info,
  AlertCircle
} from 'lucide-react';
import { useResume } from '../../context/ResumeContext';
import { AtsService } from '../../services/atsService';
import { Job, ATSScoreDetailResult, AISuggestionItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { API_CONFIG } from '../../config/api';
import { AiSuggestionsPanel } from './AiSuggestionsPanel';

interface AtsScoreDashboardProps {
  onNavigateToResume?: () => void;
  onNavigateToJobs?: () => void;
}

export const AtsScoreDashboard: React.FC<AtsScoreDashboardProps> = ({ 
  onNavigateToResume,
  onNavigateToJobs 
}) => {
  const { versions, activeResumeId, setActiveResumeId, evaluateJobAts, fetchAiSuggestions, aiSuggestions } = useResume();
  const { showToast } = useToast();

  const allJobs: Job[] = useMemo(() => AtsService.getAllAvailableJobs(), []);

  // Selection states
  const [selectedResumeId, setSelectedResumeId] = useState<string>(activeResumeId || (versions[0]?.resume_id || ''));
  const [selectedJobId, setSelectedJobId] = useState<string>(allJobs[0] ? String(allJobs[0].job_id) : '');

  const [atsScoreData, setAtsScoreData] = useState<ATSScoreDetailResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync selectedResumeId if activeResumeId changes
  useEffect(() => {
    if (activeResumeId) {
      setSelectedResumeId(activeResumeId);
    }
  }, [activeResumeId]);

  const loadAtsData = useCallback(async (resumeId: string, jobId: string) => {
    if (!resumeId || !jobId) return;

    setIsLoading(true);
    setIsLoadingSuggestions(true);
    setError(null);

    try {
      const scoreResult = await evaluateJobAts(resumeId, jobId);
      setAtsScoreData(scoreResult);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err?.message || 'Unable to compute ATS match score at this time.');
    } finally {
      setIsLoading(false);
    }

    try {
      await fetchAiSuggestions(resumeId, jobId);
    } catch (err: any) {
      console.warn('AI suggestions error:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [evaluateJobAts, fetchAiSuggestions]);

  // Fetch / compute ATS score on selector change
  useEffect(() => {
    if (selectedResumeId && selectedJobId) {
      loadAtsData(selectedResumeId, selectedJobId);
    }
  }, [selectedResumeId, selectedJobId, loadAtsData]);

  const selectedJob = allJobs.find(j => String(j.job_id) === String(selectedJobId)) || allJobs[0];
  const selectedResume = versions.find(v => v.resume_id === selectedResumeId) || versions[0];

  const score = atsScoreData?.match_score ?? 84;
  const isInterviewReady = score >= 80;

  // SVG Gauge calculations (radius = 54, circumference = 2 * PI * 54 = 339.29)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * score) / 100;

  // Color mapping based on score
  const gaugeColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied "${text}" to clipboard`, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Empty state if no resumes
  if (versions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Upload a Resume First
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
          You need at least one uploaded resume version to calculate real-time ATS match scores and gap analysis.
        </p>
        {onNavigateToResume && (
          <button
            onClick={onNavigateToResume}
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Upload Resume Variant →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              ATS Evaluation Hub
            </span>
            {API_CONFIG.USE_MOCK && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Mock Data
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">• 80% Benchmark Threshold</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            ATS Match Score & Gap Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-2xl">
            Evaluate any resume version against specific role requirements to identify missing keywords and technical requirements before applying.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {onNavigateToResume && (
            <button
              onClick={onNavigateToResume}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Manage Resumes</span>
            </button>
          )}
          {onNavigateToJobs && (
            <button
              onClick={onNavigateToJobs}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Job Feed →</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert Banner if scoring fails */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-700 dark:text-rose-300 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold">Evaluation Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadAtsData(selectedResumeId, selectedJobId)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Calculation</span>
          </button>
        </div>
      )}

      {/* Dual Selector Control Strip */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-subtle grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Selector 1: Resume Version */}
        <div>
          <label 
            htmlFor="resume-version-select"
            className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Select Resume Version:</span>
          </label>
          <div className="relative">
            <select
              id="resume-version-select"
              value={selectedResumeId}
              onChange={(e) => {
                setSelectedResumeId(e.target.value);
                setActiveResumeId(e.target.value);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
            >
              {versions.map((ver) => (
                <option key={ver.resume_id} value={ver.resume_id}>
                  v{ver.version} — {ver.version_label || ver.filename} {ver.is_default ? '(Active Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selector 2: Target Job Posting */}
        <div>
          <label 
            htmlFor="target-job-select"
            className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Select Target Role / Job:</span>
          </label>
          <div className="relative">
            <select
              id="target-job-select"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
            >
              {allJobs.map((job) => (
                <option key={job.job_id} value={String(job.job_id)}>
                  {job.title} @ {job.company} ({job.work_environment || 'Remote'}) — {job.salary_range}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* Left Column (8 cols): Circular Gauge & Gap Breakdown */}
        <div className="lg:col-span-8 space-y-6">

          {/* Hero Card: Circular ATS Gauge + 80% Threshold Status */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-8 shadow-subtle flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative overflow-hidden">
            
            {/* Circular SVG Gauge */}
            <div className="flex-shrink-0 flex items-center justify-center relative">
              <svg className="w-36 h-36 sm:w-40 sm:h-40 transform -rotate-90" viewBox="0 0 130 130">
                {/* Background Track */}
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="12"
                  fill="transparent"
                  className="dark:stroke-slate-700"
                />
                {/* Dynamic Progress Stroke */}
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke={gaugeColor}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                {isLoading ? (
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                ) : (
                  <>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                      {score}
                    </span>
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mt-1">
                      ATS MATCH
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Match Information & Benchmark Status */}
            <div className="flex-1 text-center md:text-left space-y-3 w-full">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-1">
                  {isInterviewReady ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      <Award className="w-3.5 h-3.5" />
                      80%+ INTERVIEW READY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      BELOW 80% THRESHOLD
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Benchmark: 80%
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {selectedJob?.title || 'Senior Software Engineer'}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                  {selectedJob?.company} • {selectedJob?.location} ({selectedJob?.work_environment || 'Remote'})
                </p>
              </div>

              {/* 80% Threshold Progress Bar Visualization */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span>0%</span>
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">▲ 80% Target Benchmark</span>
                  <span>100%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative border border-slate-200/80 dark:border-slate-700">
                  {/* 80% marker line */}
                  <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-slate-400 dark:bg-slate-500 z-10"></div>
                  {/* Active Fill */}
                  <div
                    className="h-full transition-all duration-700 rounded-full"
                    style={{
                      width: `${score}%`,
                      backgroundColor: gaugeColor
                    }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {isInterviewReady
                  ? '✨ Great job! Your selected resume version meets top candidate criteria for this role.'
                  : '⚠️ Your match score is below the 80% recruiter interview threshold. Review the missing requirements below.'}
              </p>
            </div>

          </div>

          {/* Conditional Gap Analysis Breakdown */}
          {!isInterviewReady ? (
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-subtle space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Identified Gaps (Score &lt; 80%)
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  Add these to reach 80%+
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Missing Technical Skills */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Missing Skills ({atsScoreData?.missing_skills.length || 0})</span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold">High Impact</span>
                  </h4>
                  <div className="space-y-2">
                    {(atsScoreData?.missing_skills || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.skill}</span>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 uppercase">
                          {item.importance}
                        </span>
                      </div>
                    ))}
                    {(atsScoreData?.missing_skills || []).length === 0 && (
                      <p className="text-xs text-slate-400 italic">No missing skills detected.</p>
                    )}
                  </div>
                </div>

                {/* 2. Missing ATS Keywords */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Missing Keywords ({atsScoreData?.missing_keywords.length || 0})</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">Parser Terms</span>
                  </h4>
                  <div className="space-y-2">
                    {(atsScoreData?.missing_keywords || []).map((keyword, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                          "{keyword}"
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(keyword, `kw_${idx}`)}
                          className="text-amber-600 hover:text-amber-800 dark:text-amber-400 p-1 flex-shrink-0 cursor-pointer"
                          title="Copy keyword"
                        >
                          {copiedKey === `kw_${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                    {(atsScoreData?.missing_keywords || []).length === 0 && (
                      <p className="text-xs text-slate-400 italic">No missing keywords detected.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Positive Good Match State when score >= 80% */
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 p-5 sm:p-7 shadow-subtle space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Outstanding Match — 80%+ Passed!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    This resume variant aligns strongly with {selectedJob?.company}'s key technical requirements.
                  </p>
                </div>
              </div>

              {/* Matched Skills List */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Strong Matching Competencies:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(atsScoreData?.matched_skills || ['React', 'TypeScript', 'Tailwind CSS', 'Figma', 'GraphQL']).map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Scores Breakdown Grid */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-subtle">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              Detailed Dimension Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Skills Overlap</span>
                <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {atsScoreData?.sub_scores?.skills_match || score}%
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Experience Fit</span>
                <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {atsScoreData?.sub_scores?.experience_fit || 88}%
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Work Style</span>
                <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {atsScoreData?.sub_scores?.work_environment_fit || 100}%
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (4 cols): AI Suggestions Panel & Job Snapshot */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* AI Suggestions Component */}
          <AiSuggestionsPanel
            suggestions={aiSuggestions}
            isLoading={isLoadingSuggestions}
            targetCompany={selectedJob?.company}
          />

          {/* Target Job Quick Snapshot */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-subtle space-y-3">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Target Job Snapshot
            </h4>
            <div className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
              <p><strong>Required Tools:</strong> {(selectedJob?.skills_required || selectedJob?.skills || []).join(', ')}</p>
              <p><strong>Industry:</strong> {selectedJob?.industry || 'Technology'}</p>
              <p><strong>Salary Range:</strong> {selectedJob?.salary_range || 'Competitive'}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

