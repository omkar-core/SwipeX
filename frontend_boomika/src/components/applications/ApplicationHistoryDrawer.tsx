import React, { useState } from 'react';
import {
  X,
  Clock,
  Building2,
  MapPin,
  DollarSign,
  User,
  ShieldCheck,
  Bot,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { ApplicationItem, ApplicationStatus } from '../../types/milestone4';
import { STATUS_CONFIG, getNextPossibleStatuses } from '../../utils/applicationStatus';
import { AiMatchBadge } from '../discover/AiMatchBadge';

interface ApplicationHistoryDrawerProps {
  application: ApplicationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (appId: string, newStatus: ApplicationStatus, note?: string) => Promise<void>;
  onWithdraw: (appId: string, reason?: string) => Promise<void>;
}

export const ApplicationHistoryDrawer: React.FC<ApplicationHistoryDrawerProps> = ({
  application,
  isOpen,
  onClose,
  onStatusChange,
  onWithdraw,
}) => {
  const [selectedNextStatus, setSelectedNextStatus] = useState<ApplicationStatus | ''>('');
  const [transitionNote, setTransitionNote] = useState<string>('');
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<boolean>(false);
  const [withdrawReason, setWithdrawReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !application) return null;

  const currentConfig = STATUS_CONFIG[application.status] || {
    label: application.status,
    badgeBg: 'bg-slate-100 text-slate-800',
    borderColor: 'border-slate-300',
    iconName: 'Clock',
  };

  const allowedNext = getNextPossibleStatuses(application.status);

  const handleAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNextStatus) return;
    try {
      setIsSubmitting(true);
      await onStatusChange(application.id, selectedNextStatus, transitionNote);
      setSelectedNextStatus('');
      setTransitionNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onWithdraw(application.id, withdrawReason);
      setShowWithdrawConfirm(false);
      setWithdrawReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActorBadge = (actor: string) => {
    switch (actor) {
      case 'recruiter':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <ShieldCheck className="w-3 h-3" />
            Recruiter Action
          </span>
        );
      case 'system':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <Bot className="w-3 h-3" />
            Automated System
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <User className="w-3 h-3" />
            You (Candidate)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-xl bg-white dark:bg-[#111827] shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${currentConfig.badgeBg}`}>
                  {currentConfig.label}
                </span>
                {((application.match_score ?? application.match_percentage) !== undefined) && (
                  <AiMatchBadge match_percentage={application.match_score ?? application.match_percentage} size="sm" />
                )}
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white pt-1">
                {application.title}
              </h2>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{application.company}</span>
                {application.location && (
                  <>
                    <span>•</span>
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{application.location}</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Overview Card */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Applied Date</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {new Date(application.applied_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Last Update</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {new Date(application.updated_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {application.salary && (
                <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 font-semibold block">Salary Compensation</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    {application.salary}
                  </span>
                </div>
              )}
            </div>

            {/* Status History Timeline */}
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-blue-600" />
                Audit Trail & Status Progression
              </h3>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {(application.status_history || []).map((entry, idx) => {
                  const toCfg = STATUS_CONFIG[entry.to_status] || {
                    label: entry.to_status,
                    badgeBg: 'bg-slate-100 text-slate-800',
                  };
                  return (
                    <div key={entry.id || idx} className="relative group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white dark:ring-[#111827] shadow-xs" />
                      
                      <div className="bg-white dark:bg-[#151D30] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${toCfg.badgeBg}`}>
                              {toCfg.label}
                            </span>
                            {entry.from_status && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                from {STATUS_CONFIG[entry.from_status]?.label || entry.from_status}
                              </span>
                            )}
                          </div>
                          {getActorBadge(entry.actor)}
                        </div>

                        {entry.note && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 leading-relaxed font-normal">
                            "{entry.note}"
                          </p>
                        )}

                        <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {new Date(entry.changed_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Advance Status Controls (Candidate test / advance) */}
            {allowedNext.length > 0 && application.status !== 'withdrawn' && (
              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200/60 dark:border-blue-900/40 space-y-3">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                  Advance Application Stage
                </h4>
                <form onSubmit={handleAdvance} className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={selectedNextStatus}
                      onChange={(e) => setSelectedNextStatus(e.target.value as ApplicationStatus)}
                      className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value="">Select next stage...</option>
                      {allowedNext.map((st) => (
                        <option key={st} value={st}>
                          {STATUS_CONFIG[st]?.label || st}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={!selectedNextStatus || isSubmitting}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Update</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Optional note / feedback for this transition..."
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-normal text-slate-800 dark:text-slate-200"
                  />
                </form>
              </div>
            )}

            {/* Withdraw Section */}
            {application.status !== 'withdrawn' && application.status !== 'rejected' && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                {!showWithdrawConfirm ? (
                  <button
                    onClick={() => setShowWithdrawConfirm(true)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Withdraw Application</span>
                  </button>
                ) : (
                  <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-3">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold">
                      <AlertCircle className="w-4 h-4" />
                      <span>Confirm Withdrawal</span>
                    </div>
                    <p className="text-[11px] text-rose-600/90 dark:text-rose-400">
                      Withdrawing will archive this application and remove it from active recruiter pipelines.
                    </p>
                    <input
                      type="text"
                      placeholder="Reason for withdrawing (optional)..."
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg p-2 text-slate-800 dark:text-slate-200"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowWithdrawConfirm(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleWithdrawSubmit}
                        className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
                      >
                        Yes, Withdraw
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
