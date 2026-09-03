import React from 'react';
import { 
  BarChart2, 
  Users, 
  Briefcase, 
  Clock, 
  Trophy, 
  TrendingUp, 
  Sparkles, 
  Award,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useRecruiter } from '../../context/RecruiterContext';

export const RecruiterAnalytics: React.FC = () => {
  const { analyticsData, postedJobs } = useRecruiter();

  const total = analyticsData.total_applicants || 18;
  const stages = analyticsData.stage_counts;

  const funnelStages = [
    { label: '1. New Applicants', count: stages.New, color: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400' },
    { label: '2. Shortlisted', count: stages.Shortlisted, color: 'bg-purple-600', text: 'text-purple-600 dark:text-purple-400' },
    { label: '3. Interviewing', count: stages.Interviewing, color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    { label: '4. Offer Extended', count: stages.Offered, color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  ];

  const topSkills = [
    { name: 'Figma & UX/UI', percentage: 88, count: 16 },
    { name: 'React & Next.js', percentage: 82, count: 15 },
    { name: 'TypeScript', percentage: 74, count: 13 },
    { name: 'Design Systems', percentage: 68, count: 12 },
    { name: 'Enterprise Prototyping', percentage: 56, count: 10 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
          <BarChart2 className="w-4 h-4" />
          <span>Talent Acquisition Intelligence</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Recruitment Analytics & Insights
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitor applicant velocity, conversion funnel stages, and talent pool match quality.
        </p>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Jobs */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Jobs
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {analyticsData.active_jobs || postedJobs.filter(j => j.status === 'active').length || 4}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-2">
              of {analyticsData.total_jobs || postedJobs.length || 5} total
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+2 new this month</span>
          </div>
        </div>

        {/* Metric 2: Total Applicants */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Applicants
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {total}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-2">
              in pipeline
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+34% discovery volume</span>
          </div>
        </div>

        {/* Metric 3: Avg Time to Hire */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Avg Time-to-Hire
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {analyticsData.avg_time_to_hire_days || 18}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1.5">
              days
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>47% faster than market</span>
          </div>
        </div>

        {/* Metric 4: Offer Acceptance Rate */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Offer Acceptance
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              87.5%
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>Tier 1 Talent conversion</span>
          </div>
        </div>
      </div>

      {/* Grid: Funnel Stages & Top Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Pipeline Funnel Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Candidate Pipeline Funnel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Conversion drop-off across hiring milestones
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg">
              Live Stage Data
            </span>
          </div>

          <div className="space-y-5">
            {funnelStages.map((stage, idx) => {
              const percentage = Math.round((stage.count / Math.max(total, 1)) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 dark:text-slate-200">{stage.label}</span>
                    <span className={stage.text}>
                      {stage.count} candidates ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(percentage, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Funnel Note */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B132B] border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p>
              Candidates moving to Interview stage boast an average ATS fit of <strong>92.4%</strong>, reducing time-to-first-screen by 60%.
            </p>
          </div>
        </div>

        {/* Right: In-Demand Skills Matrix (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Top Talent Skills
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Frequency in current applicant deck
              </p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-4">
            {topSkills.map((skill, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">{skill.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono">
                    {skill.percentage}% ({skill.count})
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${skill.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Sourcing Channel Breakdown */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Discovery Channels
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-base font-black text-slate-900 dark:text-white">74%</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Direct Swipes</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-base font-black text-slate-900 dark:text-white">18%</span>
                <p className="text-[10px] text-slate-500 mt-0.5">AI Affinity</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-base font-black text-slate-900 dark:text-white">8%</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Direct Invite</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
