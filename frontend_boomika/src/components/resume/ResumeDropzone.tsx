import React, { useRef, useState } from 'react';
import { CloudUpload, FolderOpen, RefreshCw, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useResume } from '../../context/ResumeContext';

interface ResumeDropzoneProps {
  onUploadSuccess?: () => void;
}

export const ResumeDropzone: React.FC<ResumeDropzoneProps> = ({ onUploadSuccess }) => {
  const { uploadResumeVariant, isUploading, uploadProgress, uploadError } = useResume();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const validateAndUpload = async (file: File) => {
    setClientError(null);

    // Client-side extension validation
    const validExtensions = ['.pdf', '.docx', '.doc'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExt) {
      setClientError('Invalid file type. Only PDF and DOCX documents (Max 5MB) are supported.');
      return;
    }

    // Size limit check (5MB)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setClientError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum 5 MB limit.`);
      return;
    }

    try {
      await uploadResumeVariant(file, versionLabel.trim() || undefined, isDefault);
      setVersionLabel('');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      // Error handled in context
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndUpload(file);
      // Reset input value to allow re-uploading same file if desired
      e.target.value = '';
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
      validateAndUpload(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-subtle">
      {/* Header & Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Upload Resume Variant
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Target specific roles with specialized resume versions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span>Set as Default / Active</span>
          </label>
        </div>
      </div>

      {/* Optional Version Label Input */}
      <div className="mb-5">
        <label 
          htmlFor="version-label-input"
          className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
        >
          Track / Version Title (Optional)
        </label>
        <input
          id="version-label-input"
          type="text"
          value={versionLabel}
          onChange={(e) => setVersionLabel(e.target.value)}
          placeholder="e.g. Senior Frontend Specialist, Fullstack Lead, Staff UI Architect"
          className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Drag & Drop Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume file dropzone. Supports PDF and DOCX up to 5MB."
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-2xl border-2 border-dashed transition-all p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
            : isUploading
            ? 'border-blue-300 bg-blue-50/20 dark:bg-slate-800/40 cursor-wait'
            : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/40'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.docx,.doc"
          className="hidden"
          tabIndex={-1}
        />

        {/* Cloud Upload Icon */}
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mb-4 shadow-sm">
          {isUploading ? (
            <RefreshCw className="w-7 h-7 animate-spin" />
          ) : (
            <CloudUpload className="w-7 h-7" />
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {isUploading ? 'Extracting Keywords & Semantic Parsing...' : 'Drag & Drop your resume here'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Supports <span className="font-semibold text-slate-700 dark:text-slate-300">PDF</span>, <span className="font-semibold text-slate-700 dark:text-slate-300">DOCX</span> (Max Size: 5 MB)
        </p>

        {/* Action Button */}
        {!isUploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer focus:ring-2 focus:ring-blue-400"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Browse Files</span>
          </button>
        )}

        {/* Progress Bar while uploading */}
        {isUploading && (
          <div className="w-full max-w-xs mt-4">
            <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
              <span>Analyzing Document...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Client / Server Error Alert */}
      {(clientError || uploadError) && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <p className="font-bold">Upload Error</p>
            <p className="mt-0.5">{clientError || uploadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setClientError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
