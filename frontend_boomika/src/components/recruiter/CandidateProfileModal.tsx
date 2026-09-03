import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  FileText, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Award, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight,
  Send,
  Download,
  DollarSign
} from 'lucide-react';
import { Applicant, PipelineStage } from '../../types';
import { useToast } from '../../context/ToastContext';

interface CandidateProfileModalProps {
  applicant: Applicant | null;
  isOpen: boolean;
  onClose: () => void;
  onMoveStage: (applicantId: string, newStage: PipelineStage, notes?: string) => void;
}

const STAGES: PipelineStage[] = ['New', 'Shortlisted', 'Interviewing', 'Offered', 'Rejected'];

export const CandidateProfileModal: React.FC<CandidateProfileModalProps> = ({
  applicant,
  isOpen,
  onClose,
  onMoveStage,
}) => {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<string>(applicant?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  if (!isOpen || !applicant) return null;

  const { candidate, stage, match_score, applied_at } = applicant;

  const handleSaveNotes = () => {
    setIsSavingNotes(true);
    setTimeout(() => {
      onMoveStage(applicant.application_id, stage, notes);
      setIsSavingNotes(false);
      showToast('Candidate notes updated', 'success');
    }, 200);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0B132B]/50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Candidate Dossier
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              ID: {applicant.candidate_id}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Candidate Primary Identity Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={candidate.profile_picture_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                  alt={candidate.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-sm"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                  {candidate.name}
                </h3>
                <p className="text-sm font-semibold text-[#2563EB] dark:text-blue-400 mt-0.5">
                  {candidate.current_title || 'Software Specialist'}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                  {candidate.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {candidate.location}
                    </span>
                  )}
                  {candidate.experience_years && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {candidate.experience_years} yrs exp
                    </span>
                  )}
                  {candidate.expected_salary && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <DollarSign className="w-3.5 h-3.5" />
                      ${(candidate.expected_salary / 1000).toFixed(0)}k/yr
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ATS Match Badge */}
            <div className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(match_score)}`}>
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-2xl font-black">{match_score}%</span>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">
                ATS Fit Score
              </span>
            </div>
          </div>

          {/* Quick Contact Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a 
              href={`mailto:${candidate.email}`}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors"
            >
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="truncate">{candidate.email}</span>
            </a>
            {candidate.phone && (
              <a 
                href={`tel:${candidate.phone}`}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors"
              >
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{candidate.phone}</span>
              </a>
            )}
          </div>

          {/* Bio Section */}
          {candidate.bio && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Candidate Summary & Bio
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                {candidate.bio}
              </p>
            </div>
          )}

          {/* Skills Assessment */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>Verified Skill Matrix</span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {candidate.skills.length} Matches Found
              </span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-800/50"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Resume Preview Box */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                  Resume Document ({candidate.name.replace(/\s+/g, '_')}_CV.pdf)
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Applied {applied_at} • Format: High Compatibility ATS PDF
                </p>
              </div>
            </div>

            <button
              onClick={() => showToast('Opening resume preview...', 'info')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>

          {/* Recruiter Evaluation Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Internal Recruiter Notes & Evaluation
              </h4>
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="text-xs font-semibold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 cursor-pointer"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add interview feedback, salary negotiations, or round 1 impressions..."
              rows={3}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0B132B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 resize-none shadow-subtle"
            />
          </div>

          {/* Current Pipeline Stage Control */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B132B] border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Current Pipeline Stage:
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-600 text-white">
                {stage}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {STAGES.map((s) => {
                const isActive = stage === s;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      onMoveStage(applicant.application_id, s, notes);
                      showToast(`Moved to ${s}`, 'info');
                    }}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-blue-400'
                        : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0B132B]/50 flex items-center justify-between">
          <button
            onClick={() => {
              onMoveStage(applicant.application_id, 'Rejected', notes);
              showToast('Application marked as Rejected', 'info');
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject Candidate</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                const nextStage: PipelineStage = 
                  stage === 'New' ? 'Shortlisted' :
                  stage === 'Shortlisted' ? 'Interviewing' :
                  stage === 'Interviewing' ? 'Offered' : 'Offered';
                onMoveStage(applicant.application_id, nextStage, notes);
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <span>Advance Stage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
