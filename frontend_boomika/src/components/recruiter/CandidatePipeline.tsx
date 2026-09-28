import React, { useState, useMemo } from 'react';
import { 
  Columns3, 
  Search, 
  Filter, 
  Sparkles, 
  Mail, 
  CheckSquare, 
  Trophy, 
  XCircle, 
  GripVertical, 
  Clock, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Plus, 
  ChevronDown, 
  RefreshCw,
  Eye,
  ArrowRight
} from 'lucide-react';
import { useRecruiter } from '../../context/RecruiterContext';
import { Applicant, PipelineStage } from '../../types';
import { CandidateProfileModal } from './CandidateProfileModal';
import { useToast } from '../../context/ToastContext';

interface ColumnConfig {
  id: PipelineStage;
  label: string;
  icon: React.ReactNode;
  color: string;
  lightBg: string;
  darkBg: string;
  badgeBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'New',
    label: 'New Applicants',
    icon: <Mail className="w-3.5 h-3.5" />,
    color: 'text-blue-600 dark:text-blue-400',
    lightBg: 'bg-blue-50/50',
    darkBg: 'dark:bg-blue-950/20',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
  },
  {
    id: 'Shortlisted',
    label: 'Shortlisted',
    icon: <CheckSquare className="w-3.5 h-3.5" />,
    color: 'text-purple-600 dark:text-purple-400',
    lightBg: 'bg-purple-50/50',
    darkBg: 'dark:bg-purple-950/20',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
  },
  {
    id: 'Interviewing',
    label: 'Interviewing',
    icon: <Calendar className="w-3.5 h-3.5" />,
    color: 'text-amber-600 dark:text-amber-400',
    lightBg: 'bg-amber-50/50',
    darkBg: 'dark:bg-amber-950/20',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  },
  {
    id: 'Offered',
    label: 'Offer Extended',
    icon: <Trophy className="w-3.5 h-3.5" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    lightBg: 'bg-emerald-50/50',
    darkBg: 'dark:bg-emerald-950/20',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
  {
    id: 'Rejected',
    label: 'Archived / Rejected',
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: 'text-slate-500 dark:text-slate-400',
    lightBg: 'bg-slate-50/50',
    darkBg: 'dark:bg-slate-900/40',
    badgeBg: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
];

export const CandidatePipeline: React.FC = () => {
  const { 
    postedJobs, 
    selectedJobId, 
    selectedJob, 
    setSelectedJobId, 
    applicantsByJob, 
    moveApplicantStage, 
    fetchApplicants,
    isLoading 
  } = useRecruiter();

  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<PipelineStage | null>(null);

  const currentJobIdKey = String(selectedJobId || (postedJobs[0]?.job_id ?? '1'));

  // Filter applicants by search query (name, current_title, or skills)
  const filteredApplicants = useMemo(() => {
    const raw = applicantsByJob[currentJobIdKey] || [];
    if (!searchQuery.trim()) return raw;
    const q = searchQuery.toLowerCase().trim();
    return raw.filter(app => {
      const c = app.candidate;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.current_title && c.current_title.toLowerCase().includes(q)) ||
        c.skills.some(s => s.toLowerCase().includes(q))
      );
    });
  }, [applicantsByJob, currentJobIdKey, searchQuery]);

  // Drag and drop handlers
  const handleDragStart = (applicationId: string) => {
    setDraggedAppId(applicationId);
  };

  const handleDragOver = (e: React.DragEvent, colId: PipelineStage) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDrop = async (targetCol: PipelineStage) => {
    if (!draggedAppId || !selectedJobId) return;
    await moveApplicantStage(selectedJobId, draggedAppId, targetCol);
    setDraggedAppId(null);
    setDragOverCol(null);
  };

  const handleDragEnd = () => {
    setDraggedAppId(null);
    setDragOverCol(null);
  };

  const openProfile = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Job Switcher */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <Columns3 className="w-4 h-4" />
            <span>Talent Pipeline Kanban</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {selectedJob ? selectedJob.title : 'Candidate Pipeline'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {selectedJob?.company} • {selectedJob?.location} • {filteredApplicants.length} Total Candidates
          </p>
        </div>

        {/* Right Controls: Job Selector + Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Job Select Dropdown */}
          <div className="relative min-w-[200px]">
            <select
              value={String(selectedJobId || '')}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-subtle"
            >
              {postedJobs.map((job) => (
                <option key={job.job_id} value={String(job.job_id)}>
                  {job.title} ({job.applicant_count || 0} applicants)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Search Filter */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate or skill..."
              className="w-full bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          <button
            onClick={() => selectedJobId && fetchApplicants(selectedJobId)}
            title="Refresh pipeline"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-4 min-w-[1100px] items-start">
          {COLUMNS.map((col) => {
            const stageApplicants = filteredApplicants.filter(a => a.stage === col.id);
            const isDragTarget = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={() => handleDrop(col.id)}
                className={`w-72 flex-shrink-0 flex flex-col rounded-2xl transition-all ${
                  isDragTarget
                    ? `${col.lightBg} ${col.darkBg} ring-2 ring-blue-500 dark:ring-blue-400 shadow-md`
                    : 'bg-slate-100/70 dark:bg-[#0B132B]/80 border border-slate-200/80 dark:border-slate-800'
                } p-3.5`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/60 dark:border-slate-800/80 mb-3">
                  <div className={`flex items-center gap-2 ${col.color}`}>
                    {col.icon}
                    <span className="text-xs font-extrabold tracking-tight text-slate-800 dark:text-slate-200">
                      {col.label}
                    </span>
                  </div>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                    {stageApplicants.length}
                  </span>
                </div>

                {/* Candidate Cards Stream */}
                <div className="flex flex-col gap-3 min-h-[400px]">
                  {stageApplicants.map((app) => {
                    const isDragging = draggedAppId === app.application_id;
                    const isHighMatch = app.match_score >= 90;

                    return (
                      <div
                        key={app.application_id}
                        draggable
                        onDragStart={() => handleDragStart(app.application_id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openProfile(app)}
                        className={`bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-xl p-4 shadow-subtle hover:shadow-card hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-grab active:cursor-grabbing select-none group relative ${
                          isDragging ? 'opacity-40 scale-95' : 'opacity-100'
                        }`}
                      >
                        {/* Top: Grip + Candidate Identity + ATS score */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={app.candidate.profile_picture_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                              alt={app.candidate.name}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {app.candidate.name}
                              </h4>
                              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {app.candidate.current_title || 'Candidate'}
                              </p>
                            </div>
                          </div>

                          {/* ATS Score Tag */}
                          <div className={`px-2 py-0.5 rounded text-[10px] font-black tracking-tight flex items-center gap-1 ${
                            isHighMatch 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          }`}>
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{app.match_score}%</span>
                          </div>
                        </div>

                        {/* Middle: Candidate Skills Preview */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {app.candidate.skills.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                          {app.candidate.skills.length > 3 && (
                            <span className="text-[10px] font-medium text-slate-400 px-1 py-0.5">
                              +{app.candidate.skills.length - 3}
                            </span>
                          )}
                        </div>

                        {/* Footer Info: Applied Time & Quick View */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {app.applied_at}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openProfile(app);
                            }}
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Profile</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {stageApplicants.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                        No candidates in {col.label}
                      </p>
                      <p className="text-[10px] text-slate-400/80 mt-1">
                        Drag candidate cards here to transition stage
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate Profile Modal */}
      {selectedApplicant && (
        <CandidateProfileModal
          applicant={selectedApplicant}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedApplicant(null);
          }}
          onMoveStage={async (appId, newStage, notes) => {
            if (selectedJobId) {
              await moveApplicantStage(selectedJobId, appId, newStage, notes);
            }
          }}
        />
      )}
    </div>
  );
};
