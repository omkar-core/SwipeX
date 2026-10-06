import React from 'react';
import { 
  Lightbulb, 
  RotateCcw,
  Sparkles,
  FileCheck2,
  ShieldCheck,
  Zap,
  Target
} from 'lucide-react';
import { API_CONFIG } from '../../config/api';
import { useResume } from '../../context/ResumeContext';
import { ResumeDropzone } from './ResumeDropzone';
import { ResumeVersionsList } from './ResumeVersionsList';
import { ParsedSkillsPreview } from './ParsedSkillsPreview';

interface UploadResumeScreenProps {
  onNavigateToAts?: () => void;
}

export const UploadResumeScreen: React.FC<UploadResumeScreenProps> = ({ onNavigateToAts }) => {
  const { resetToDefaultResume, activeResume } = useResume();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Milestone 3 Engine
            </span>
            {API_CONFIG.USE_MOCK && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Mock Data
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">• Multi-Version ATS Ready</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Resume Versions & ATS Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-2xl">
            Upload and maintain tailored resume variants for different job tracks. The active default version is used by the Swipe Match engine.
          </p>
        </div>

        {onNavigateToAts && (
          <button
            type="button"
            onClick={onNavigateToAts}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>Open ATS Score Dashboard →</span>
          </button>
        )}
      </div>

      {/* Main Grid: Dropzone & Versions vs Tips Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* Left 8 Cols: Upload Zone + Versions List + Parsed Skills */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Drag & Drop Upload Zone */}
          <ResumeDropzone />

          {/* 2. Resume Versions List */}
          <ResumeVersionsList />

          {/* 3. Parsed Skills & Taxonomy Preview */}
          {activeResume && <ParsedSkillsPreview />}
        </div>

        {/* Right 4 Cols: ATS Optimization Tips & System Health */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* ATS Optimization Guide Card */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-subtle">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4">
              <Lightbulb className="w-5 h-5" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                ATS Optimization Rules
              </h3>
            </div>

            <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-1.5"></span>
                <span>
                  <strong className="text-slate-900 dark:text-white font-semibold">Standard Fonts:</strong> Export cleanly in Arial, Inter, or Helvetica without graphic text layers.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-1.5"></span>
                <span>
                  <strong className="text-slate-900 dark:text-white font-semibold">Single Column Layout:</strong> Multi-column tables often confuse legacy enterprise ATS parsers (Workday, Taleo).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-1.5"></span>
                <span>
                  <strong className="text-slate-900 dark:text-white font-semibold">Action + Impact Metrics:</strong> Ensure every project bullet includes quantified percentages or scale.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-1.5"></span>
                <span>
                  <strong className="text-slate-900 dark:text-white font-semibold">80% Benchmark:</strong> Reaching 80%+ ATS score triggers priority recruiter feed highlighting.
                </span>
              </li>
            </ul>

            {API_CONFIG.USE_MOCK && (
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetToDefaultResume}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo Resume Versions</span>
                </button>
              </div>
            )}
          </div>

          {/* Neural Parser Status Card */}
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-blue-800/40">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Neural ATS Kernel v4.2
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Real-time semantic skill overlap and vector embedding calculation enabled. Evaluates exact keyword matches, framework variants, and years of experience.
            </p>
            <div className="flex items-center justify-between text-[11px] font-semibold text-blue-300 pt-2 border-t border-blue-800/50">
              <span>Latency: ~280ms</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Engine Ready
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
