import React, { useRef, useState } from 'react';
import { 
  CloudUpload, 
  FolderOpen, 
  RefreshCw, 
  CheckCircle2, 
  Lightbulb, 
  Check, 
  FileText
} from 'lucide-react';
import { useResume } from '../../context/ResumeContext';
import { useToast } from '../../context/ToastContext';

export const UploadResumeScreen: React.FC = () => {
  const { resume, isUploading, uploadProgress, uploadResumeFile, resetToDefaultResume } = useResume();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadResumeFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadResumeFile(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Upload Resume
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Optimize your profile for our ATS evaluation engine.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Content Area (col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Dashed Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full bg-white rounded-2xl border-2 border-dashed transition-all p-10 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer shadow-subtle ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/40'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc"
              className="hidden"
            />

            {/* Cloud Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-[#EBF3FF] flex items-center justify-center text-[#2563EB] mb-4">
              <CloudUpload className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Drag & Drop your resume here
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Supports PDF, DOCX (Max 5MB)
            </p>

            {/* Browse Files Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-5 flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Browse Files</span>
            </button>
          </div>

          {/* Analyzing Document Progress Bar & Parsed Result Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
            
            {/* Progress Header Strip */}
            <div className="bg-[#F0F6FB] px-6 py-3.5 border-b border-slate-200/80 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isUploading ? 'animate-spin' : ''}`} />
                  <span>Analyzing Document...</span>
                </div>
                <span className="text-xs font-bold text-[#2563EB]">
                  {uploadProgress}%
                </span>
              </div>

              {/* Progress Line */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-200">
                <div
                  className="h-full bg-[#2563EB] transition-all duration-300 rounded-r-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>

            {/* Parsed Result Card Body */}
            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5 fill-emerald-600 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {resume.filename || 'johndoe_resume_2024.pdf'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Parsed successfully. Ready for ATS matching.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer flex-shrink-0"
                >
                  Re-upload
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                
                {/* Metric 1: OVERALL FIT SCORE */}
                <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-5">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    OVERALL FIT SCORE
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-[#2563EB] tracking-tight">
                      {resume.overall_fit_score || 84}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      /100
                    </span>
                  </div>
                </div>

                {/* Metric 2: FORMAT COMPATIBILITY */}
                <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-5">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    FORMAT COMPATIBILITY
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {resume.format_compatibility || 'High'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Parsed Extracted Skills */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Extracted ATS Skill Keywords
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {resume.parsed_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-[#EBF3FF] text-[#2563EB] px-2.5 py-1 rounded-md border border-blue-100"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Sidebar: ATS Optimization Tips (col-span-4) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-subtle">
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <Lightbulb className="w-5 h-5" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                ATS Optimization Tips
              </h3>
            </div>

            <ul className="space-y-3.5 text-xs text-slate-600 font-normal leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full border border-slate-400 flex-shrink-0 mt-1.5"></span>
                <span>Use standard fonts like Arial or Helvetica.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full border border-slate-400 flex-shrink-0 mt-1.5"></span>
                <span>Avoid complex layouts, tables, or columns.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full border border-slate-400 flex-shrink-0 mt-1.5"></span>
                <span>Ensure precise keyword matching for desired roles.</span>
              </li>
            </ul>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={resetToDefaultResume}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-md transition-colors"
              >
                Reset Demo Resume
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
