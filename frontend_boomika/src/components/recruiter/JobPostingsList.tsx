import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Users, 
  Clock, 
  MapPin, 
  DollarSign, 
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  FileEdit,
  Filter
} from 'lucide-react';
import { useRecruiter } from '../../context/RecruiterContext';
import { JobStatus, RecruiterJob } from '../../types';

interface JobPostingsListProps {
  onSelectJob: (jobId: string | number) => void;
  onNewJob: () => void;
}

export const JobPostingsList: React.FC<JobPostingsListProps> = ({ onSelectJob, onNewJob }) => {
  const { postedJobs, updateJobStatus, isLoading } = useRecruiter();
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJobs = useMemo(() => {
    return postedJobs.filter((job) => {
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        job.title.toLowerCase().includes(q) || 
        job.location.toLowerCase().includes(q) ||
        (job.skills || []).some(s => s.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [postedJobs, statusFilter, searchQuery]);

  const getStatusBadge = (status?: JobStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            Draft
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Job Inventory</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            My Posted Jobs
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your listings, review applicants, and control recruitment status.
          </p>
        </div>

        <button
          onClick={onNewJob}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Post a New Job</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-4 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-auto">
          {(['all', 'active', 'draft', 'closed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                statusFilter === tab
                  ? 'bg-white dark:bg-[#111827] text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by title, location, skill..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0B132B] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Jobs Grid / List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <div
            key={job.job_id}
            className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-2xl p-5 sm:p-6 shadow-subtle hover:border-blue-300 dark:hover:border-blue-500/60 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
          >
            {/* Left: Job Meta */}
            <div className="space-y-2.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(job.status)}
                {job.work_environment && (
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {job.work_environment}
                  </span>
                )}
                {job.industry && (
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    • {job.industry}
                  </span>
                )}
              </div>

              <div>
                <h3 
                  onClick={() => onSelectJob(job.job_id)}
                  className="text-lg font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                >
                  {job.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {job.company} • {job.location} • {job.salary_range || '$140k-$180k'}
                </p>
              </div>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(job.skills_required || job.skills || []).slice(0, 5).map((skill, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-semibold bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/40"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Applicant Count & Actions */}
            <div className="flex flex-wrap md:flex-col items-start md:items-end gap-3 self-stretch md:self-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              {/* Applicant Count Pill */}
              <div 
                onClick={() => onSelectJob(job.job_id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{job.applicant_count || 0} Candidates</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Switcher Dropdown */}
                <select
                  value={job.status || 'active'}
                  onChange={(e) => updateJobStatus(job.job_id, e.target.value as JobStatus)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                </select>

                {/* Pipeline Button */}
                <button
                  onClick={() => onSelectJob(job.job_id)}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  <span>View Pipeline</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              No job postings found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Try adjusting your status filter or search query, or create a brand new job posting.
            </p>
            <button
              onClick={onNewJob}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Post First Job
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
