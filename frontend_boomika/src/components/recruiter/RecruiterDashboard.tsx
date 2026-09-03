import React, { useState } from 'react';
import { 
  Briefcase, 
  Users, 
  Plus, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight, 
  TrendingUp, 
  Calendar, 
  Eye, 
  Layers,
  MapPin
} from 'lucide-react';
import { useRecruiter } from '../../context/RecruiterContext';
import { useAuth } from '../../context/AuthContext';
import { Applicant } from '../../types';
import { CandidateProfileModal } from './CandidateProfileModal';

interface RecruiterDashboardProps {
  onNavigateToPostJob: () => void;
  onNavigateToPipeline: (jobId?: string | number) => void;
  onNavigateToJobs: () => void;
}

export const RecruiterDashboard: React.FC<RecruiterDashboardProps> = ({
  onNavigateToPostJob,
  onNavigateToPipeline,
  onNavigateToJobs,
}) => {
  const { postedJobs, applicantsByJob, analyticsData, moveApplicantStage } = useRecruiter();
  const { user } = useAuth();

  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Aggregate recent applicants from all jobs
  const allApplicantsList: Applicant[] = Object.values(applicantsByJob).flat();
  const recentApplicants = (allApplicantsList.length > 0 ? allApplicantsList : []).slice(0, 5);

  const activeJobs = postedJobs.filter(j => j.status === 'active');
  const totalApplicants = analyticsData.total_applicants || allApplicantsList.length || 18;

  const openCandidate = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative circle glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider text-blue-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recruiter Command Center</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Welcome back, {user?.name || 'Partner'}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 max-w-xl font-normal leading-relaxed">
            Your automated ATS pipeline has matched <strong className="text-white font-bold">{totalApplicants} top-tier candidates</strong> this week with a 91% average skills affinity score.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full sm:w-auto">
          <button
            onClick={onNavigateToPostJob}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Post a Job</span>
          </button>

          <button
            onClick={() => onNavigateToPipeline()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-800/80 hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl border border-white/20 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>View Pipeline</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Active Job Posts
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {activeJobs.length || 4}
            </span>
            <span className="text-xs font-semibold text-slate-400">active now</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pipeline Candidates
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {totalApplicants}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+12% this wk</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              High ATS Fit (90%+)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              12
            </span>
            <span className="text-xs font-semibold text-slate-400">ready to screen</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Avg Time to Hire
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {analyticsData.avg_time_to_hire_days || 18}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">days (-16d)</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Job Listings & Recent Applicants (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Active Job Listings */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 shadow-subtle space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Active Listings Overview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Currently published and receiving candidate swipes
                </p>
              </div>
              <button
                onClick={onNavigateToJobs}
                className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>View All ({postedJobs.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {postedJobs.slice(0, 4).map((job) => (
                <div
                  key={job.job_id}
                  className="py-3.5 flex items-center justify-between gap-4 group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors cursor-pointer"
                  onClick={() => onNavigateToPipeline(job.job_id)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {job.title}
                      </h4>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {job.status || 'active'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <span>{job.company}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{job.salary_range || '$150k-$180k'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {job.applicant_count || 4} Candidates
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Active pipeline
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Candidate Applicants Stream */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 shadow-subtle space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent Candidate Swipes & Applications
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest profiles matching your active roles
                </p>
              </div>
              <button
                onClick={() => onNavigateToPipeline()}
                className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Full Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentApplicants.map((app) => (
                <div
                  key={app.application_id}
                  onClick={() => openCandidate(app)}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-[#0B132B] transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={app.candidate.profile_picture_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                      alt={app.candidate.name}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {app.candidate.name}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {app.stage}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        {app.candidate.current_title} • {app.candidate.location || 'Remote'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* ATS Badge */}
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                        <Sparkles className="w-3 h-3" />
                        {app.match_score}% Fit
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {app.applied_at}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Dossier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Mini Pipeline Funnel & Quick Tools (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Mini Pipeline Funnel */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pipeline Funnel Snapshot
            </h3>

            <div className="space-y-3">
              {[
                { stage: 'New', count: analyticsData.stage_counts.New || 6, color: 'bg-blue-600' },
                { stage: 'Shortlisted', count: analyticsData.stage_counts.Shortlisted || 5, color: 'bg-purple-600' },
                { stage: 'Interviewing', count: analyticsData.stage_counts.Interviewing || 3, color: 'bg-amber-500' },
                { stage: 'Offered', count: analyticsData.stage_counts.Offered || 2, color: 'bg-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {item.stage}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(20, item.count * 15))}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white w-5 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigateToPipeline()}
              className="w-full mt-2 py-2.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-[#2563EB] dark:text-blue-300 text-xs font-bold rounded-xl transition-colors text-center cursor-pointer block"
            >
              Open Interactive Kanban Board →
            </button>
          </div>

          {/* Recruiter Pro Tips */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-subtle space-y-3 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Smart Sourcing Tips</span>
            </div>
            <h4 className="text-sm font-bold text-white">
              Instant ATS Skill Weighting
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Adding 4+ specific technology keywords to your job postings improves top-match recommendation quality by <strong>38%</strong>.
            </p>
            <button
              onClick={onNavigateToPostJob}
              className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              Create Optimized Listing
            </button>
          </div>
        </div>
      </div>

      {/* Dossier Modal */}
      {selectedApplicant && (
        <CandidateProfileModal
          applicant={selectedApplicant}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedApplicant(null);
          }}
          onMoveStage={async (appId, newStage, notes) => {
            if (selectedApplicant.job_id) {
              await moveApplicantStage(selectedApplicant.job_id, appId, newStage, notes);
            }
          }}
        />
      )}
    </div>
  );
};
