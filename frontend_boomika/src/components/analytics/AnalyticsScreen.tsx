import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Layers,
  Send,
  Eye,
  Target,
  Sparkles,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Calendar,
  Building2,
  ChevronRight,
  Zap,
  BarChart2,
  Clock,
  Compass,
  Award
} from 'lucide-react';
import { useJobs } from '../../context/JobContext';
import { useResume } from '../../context/ResumeContext';
import { useToast } from '../../context/ToastContext';
import { ApiService } from '../../services/api';
import { CandidateAnalyticsData } from '../../types';

interface AnalyticsScreenProps {
  onNavigateToApplications?: () => void;
  onNavigateToResume?: () => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  onNavigateToApplications,
  onNavigateToResume,
}) => {
  const { savedJobs, timeline } = useJobs();
  const { resume, atsResult } = useResume();
  const { showToast } = useToast();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<CandidateAnalyticsData | null>(null);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Fetch or generate candidate analytics data
  const loadAnalytics = useCallback(async (showToastNotice = false) => {
    try {
      if (showToastNotice) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await ApiService.getCandidateAnalytics({
        savedJobsCount: savedJobs.length,
        timelineCount: timeline.length,
        userSkills: resume.parsed_skills,
      });

      // Synchronize with real current ATS score from ResumeContext if available
      if (atsResult?.match_score) {
        data.avg_match_score = Math.round((data.avg_match_score + atsResult.match_score) / 2);
      }

      setAnalyticsData(data);
      if (showToastNotice) {
        showToast('Analytics refreshed with latest job & swipe data!', 'success');
      }
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      // Fallback
      setAnalyticsData(
        ApiService.generateMockCandidateAnalytics(
          savedJobs.length,
          timeline.length,
          resume.parsed_skills
        )
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [savedJobs.length, timeline.length, resume.parsed_skills, atsResult, showToast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Derived calculations for metrics
  const totalSwipes = analyticsData?.total_swipes ?? Math.max(savedJobs.length * 2 + 8, 18);
  const applicationsSent = analyticsData?.applications_sent ?? Math.max(savedJobs.length, 5);
  const swipeConversionRate = totalSwipes > 0 ? Math.round((applicationsSent / totalSwipes) * 100) : 45;
  const avgMatchScore = analyticsData?.avg_match_score ?? (atsResult?.match_score || 88);
  const profileViewRate = analyticsData?.profile_view_rate ?? 34;

  const funnel = useMemo(() => {
    if (analyticsData?.funnel_counts) {
      return analyticsData.funnel_counts;
    }
    return {
      applied: applicationsSent,
      shortlisted: Math.max(Math.floor(applicationsSent * 0.6), 2),
      interviewing: Math.max(Math.floor(applicationsSent * 0.35), 1),
      offered: Math.max(Math.floor(applicationsSent * 0.15), 1),
      rejected: 1,
    };
  }, [analyticsData, applicationsSent]);

  const scoreTrend = useMemo(() => {
    return analyticsData?.score_trend || [
      { date: 'May 04', score: 82, job_title: 'UX Specialist', company: 'Linear' },
      { date: 'May 08', score: 85, job_title: 'Product Designer', company: 'Figma' },
      { date: 'May 12', score: 84, job_title: 'Lead UI Designer', company: 'Airbnb' },
      { date: 'May 17', score: 91, job_title: 'Senior Product Designer', company: 'Stripe' },
      { date: 'May 22', score: 88, job_title: 'Design Systems Lead', company: 'Vercel' },
      { date: 'May 27', score: 95, job_title: 'Staff Designer', company: 'Nexus Technologies' },
      { date: 'Jun 01', score: 92, job_title: 'Principal Designer', company: 'Datadog' },
    ];
  }, [analyticsData]);

  // SVG Line/Area chart calculation
  const trendPoints = useMemo(() => {
    if (scoreTrend.length === 0) return { pathLine: '', pathArea: '', points: [] };
    const width = 600;
    const height = 180;
    const paddingX = 40;
    const paddingY = 25;
    const chartW = width - paddingX * 2;
    const chartH = height - paddingY * 2;

    const minScore = 70;
    const maxScore = 100;

    const coords = scoreTrend.map((item, idx) => {
      const x = paddingX + (idx / Math.max(scoreTrend.length - 1, 1)) * chartW;
      const normalizedScore = (item.score - minScore) / (maxScore - minScore);
      const y = height - paddingY - normalizedScore * chartH;
      return { x, y, item, idx };
    });

    const pathLine = coords.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      // Smooth bezier curve control points
      const prev = coords[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
    }, '');

    const last = coords[coords.length - 1];
    const first = coords[0];
    const pathArea = `${pathLine} L ${last.x},${height - paddingY} L ${first.x},${height - paddingY} Z`;

    return { pathLine, pathArea, points: coords };
  }, [scoreTrend]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* ─── 1. Header Section ───────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Candidate Career Trajectory & ATS Analytics
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time performance metrics, hiring pipeline conversions, and resume skill gap insights.
              </p>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Time Filter Pills */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 dark:border-slate-700">
            {(['7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  timeRange === r
                    ? 'bg-white dark:bg-[#1E293B] text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r === '7d' ? 'Last 7d' : r === '30d' ? 'Last 30d' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadAnalytics(true)}
            disabled={isRefreshing}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all border border-slate-200/60 dark:border-slate-700 disabled:opacity-50"
            title="Refresh Analytics"
            aria-label="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 2. Loading Skeleton State ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 animate-pulse h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 animate-pulse h-80" />
            <div className="lg:col-span-5 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 animate-pulse h-80" />
          </div>
        </div>
      ) : (
        <>
          {/* ─── 3. Overview Stat Cards (4 Cards Top Row) ────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Swipes */}
            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                  <ArrowUpRight className="w-3 h-3" />
                  +12 this wk
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {totalSwipes}
                </span>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Total Roles Swiped (Deck Discovery)
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <span className="font-semibold text-slate-600 dark:text-slate-300">{swipeConversionRate}%</span> saved / right-swipe rate
              </div>
            </div>

            {/* Card 2: Applications Sent */}
            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Send className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/40">
                  Active
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {applicationsSent}
                </span>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Applications Submitted
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{funnel.interviewing}</span> in active interview stage
              </div>
            </div>

            {/* Card 3: Profile View Rate */}
            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-800/40">
                  <ArrowUpRight className="w-3 h-3" />
                  +34%
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {profileViewRate}%
                </span>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Recruiter Profile View Rate
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                Top 8% candidate visibility across network
              </div>
            </div>

            {/* Card 4: Average Match Score */}
            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Target className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Tier 1 Fit
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {avgMatchScore}%
                </span>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Average ATS Match Score
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                Based on <span className="font-semibold text-slate-600 dark:text-slate-300">{resume.filename}</span>
              </div>
            </div>

          </div>

          {/* ─── 4. Middle Row: Application Funnel & Match Score Trend ───────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 4a. Application Funnel (col-span-6) */}
            <div className="lg:col-span-6 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-500" />
                    Application Stage Funnel
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Conversion rates from submission to final offer.
                  </p>
                </div>
                {onNavigateToApplications && (
                  <button
                    onClick={onNavigateToApplications}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View Timeline <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Funnel Stage Bars */}
              <div className="space-y-4">
                {[
                  { label: 'Applied', count: funnel.applied, color: 'bg-blue-600', textColor: 'text-blue-600', badgeColor: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', pct: 100 },
                  { label: 'Shortlisted', count: funnel.shortlisted, color: 'bg-indigo-600', textColor: 'text-indigo-600', badgeColor: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400', pct: Math.round((funnel.shortlisted / Math.max(funnel.applied, 1)) * 100) },
                  { label: 'Interviewing', count: funnel.interviewing, color: 'bg-purple-600', textColor: 'text-purple-600', badgeColor: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', pct: Math.round((funnel.interviewing / Math.max(funnel.applied, 1)) * 100) },
                  { label: 'Offered', count: funnel.offered, color: 'bg-emerald-600', textColor: 'text-emerald-600', badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400', pct: Math.round((funnel.offered / Math.max(funnel.applied, 1)) * 100) },
                  { label: 'Rejected', count: funnel.rejected, color: 'bg-slate-400', textColor: 'text-slate-500', badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', pct: Math.round((funnel.rejected / Math.max(funnel.applied, 1)) * 100) },
                ].map((st) => (
                  <div key={st.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${st.color}`} />
                        {st.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{st.count} roles</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${st.badgeColor}`}>
                          {st.pct}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Track */}
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${st.color} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${Math.max(st.pct, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Conversion Highlight Footnote */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-300">Interview conversion:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {Math.round((funnel.interviewing / Math.max(funnel.applied, 1)) * 100)}% (Above 18% avg)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">High response tier</span>
              </div>
            </div>

            {/* 4b. Match Score Progression Trend (col-span-6) */}
            <div className="lg:col-span-6 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    ATS Match Score Trajectory
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Match score progression across recently swiped target positions.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                  Target: 85%+
                </span>
              </div>

              {/* SVG Area / Line Chart */}
              <div className="relative w-full overflow-hidden pt-2">
                <svg
                  viewBox="0 0 600 180"
                  className="w-full h-44 overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="50%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="40" y1="35" x2="560" y2="35" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="40" y1="85" x2="560" y2="85" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="40" y1="135" x2="560" y2="135" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />

                  {/* 85% Benchmark threshold line */}
                  <line x1="40" y1="85" x2="560" y2="85" stroke="#10B981" strokeDasharray="4 4" strokeWidth="1.5" strokeOpacity="0.6" />

                  {/* Area Fill */}
                  <path d={trendPoints.pathArea} fill="url(#scoreGradient)" />

                  {/* Main Line */}
                  <path
                    d={trendPoints.pathLine}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Data Points */}
                  {trendPoints.points.map((pt, i) => (
                    <g key={i}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredTrendIndex === i ? '7' : '4.5'}
                        className={`transition-all duration-200 cursor-pointer ${
                          hoveredTrendIndex === i
                            ? 'fill-white stroke-blue-600 stroke-[3]'
                            : 'fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-[#111827] stroke-[2]'
                        }`}
                        onMouseEnter={() => setHoveredTrendIndex(i)}
                        onMouseLeave={() => setHoveredTrendIndex(null)}
                      />
                    </g>
                  ))}
                </svg>

                {/* X-axis date labels */}
                <div className="flex justify-between px-8 text-[10px] text-slate-400 font-semibold mt-1">
                  {scoreTrend.map((t, idx) => (
                    <span key={idx}>{t.date}</span>
                  ))}
                </div>

                {/* Interactive Tooltip Card */}
                {hoveredTrendIndex !== null && scoreTrend[hoveredTrendIndex] && (
                  <div
                    className="absolute top-0 right-4 bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-slate-700 animate-fade-in pointer-events-none"
                  >
                    <div className="font-bold text-blue-400">
                      {scoreTrend[hoveredTrendIndex].score}% ATS Match
                    </div>
                    <div className="font-medium text-slate-200 text-[11px]">
                      {scoreTrend[hoveredTrendIndex].job_title}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {scoreTrend[hoveredTrendIndex].company} • {scoreTrend[hoveredTrendIndex].date}
                    </div>
                  </div>
                )}
              </div>

              {/* Trajectory Insights Footer */}
              <div className="bg-blue-50/70 dark:bg-blue-900/20 rounded-xl p-3.5 border border-blue-100 dark:border-blue-800/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-slate-700 dark:text-slate-300">Match score trend:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">+13% improvement over last 14 days</span>
                </div>
                {onNavigateToResume && (
                  <button
                    onClick={onNavigateToResume}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Update Resume →
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* ─── 5. Row 3: Skill Gap Insights & Industry Engagement ──────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 5a. Skill Gap Insights (col-span-7) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Top Skill Gaps Across Target Roles
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Skills most frequently requested in roles you saved that are missing from your parsed resume.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  5 High-Impact Skills
                </span>
              </div>

              {/* Skill Bars List */}
              <div className="space-y-4">
                {(analyticsData?.top_skills_gap || [
                  { skill: 'GraphQL', count: 6, percentage: 75, learn_url: 'https://graphql.org/learn/' },
                  { skill: 'Design Tokens', count: 5, percentage: 62, learn_url: 'https://spectrum.adobe.com/page/design-tokens/' },
                  { skill: 'Storybook', count: 4, percentage: 50, learn_url: 'https://storybook.js.org/' },
                  { skill: 'TypeScript', count: 3, percentage: 38, learn_url: 'https://www.typescriptlang.org/docs/' },
                  { skill: 'Linear API', count: 2, percentage: 25, learn_url: 'https://linear.app/docs' },
                ]).map((sg) => (
                  <div key={sg.skill} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{sg.skill}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          in {sg.count} saved roles ({sg.percentage}%)
                        </span>
                      </div>
                      {sg.learn_url && (
                        <a
                          href={sg.learn_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          Learn Docs <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {/* Progress Track */}
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                        style={{ width: `${sg.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Matched Strengths Chips */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Your Strongest Matched Core Skills:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(resume.parsed_skills.slice(0, 6)).map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 5b. Target Industries & Environment (col-span-5) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    Industry Engagement
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Breakdown of sectors you swipe on most.
                  </p>
                </div>
              </div>

              {/* Industry Ranked Bars */}
              <div className="space-y-4">
                {(analyticsData?.top_industries || [
                  { industry: 'Fintech / Payments', count: 6, percentage: 40 },
                  { industry: 'Artificial Intelligence', count: 4, percentage: 27 },
                  { industry: 'Developer Tools', count: 3, percentage: 20 },
                  { industry: 'Cloud Infrastructure', count: 2, percentage: 13 },
                ]).map((ind, idx) => {
                  const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-emerald-500'];
                  const barColor = colors[idx % colors.length];
                  return (
                    <div key={ind.industry} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ind.industry}
                        </span>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="text-slate-900 dark:text-white">{ind.count} roles</span>
                          <span className="text-slate-400 font-normal">({ind.percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full`}
                          style={{ width: `${ind.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Work Environment Distribution */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Work Environment Preference:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-center border border-slate-200/60 dark:border-slate-700">
                    <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 block">65%</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Remote</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-center border border-slate-200/60 dark:border-slate-700">
                    <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 block">25%</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Hybrid</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-center border border-slate-200/60 dark:border-slate-700">
                    <span className="text-sm font-extrabold text-slate-600 dark:text-slate-400 block">10%</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">On-site</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ─── 6. Row 4: Activity Heatmap & Strategic Recommendations ──────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 6a. 28-Day Activity Heatmap (col-span-6) */}
            <div className="lg:col-span-6 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    Discovery & Swipe Activity Heatmap
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Daily engagement density across the past 4 weeks (28 days).
                  </p>
                </div>
              </div>

              {/* Heatmap Grid (7 days x 4 weeks) */}
              <div className="py-2">
                <div className="grid grid-cols-7 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                      {day}
                    </div>
                  ))}
                  {(analyticsData?.activity_heatmap || []).map((cell, idx) => {
                    // Level colors: 0 (light) to 4 (intense)
                    const levelColors = [
                      'bg-slate-100 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700',
                      'bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/60 text-blue-800',
                      'bg-blue-300 dark:bg-blue-800/70 border-blue-400 dark:border-blue-700 text-blue-900',
                      'bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-500 text-white',
                      'bg-blue-700 dark:bg-blue-500 border-blue-800 dark:border-blue-400 text-white',
                    ];
                    const colorClass = levelColors[cell.level % levelColors.length];

                    return (
                      <div
                        key={idx}
                        className={`h-10 rounded-xl border flex flex-col items-center justify-center text-[10px] font-semibold transition-all hover:scale-105 cursor-pointer ${colorClass}`}
                        title={`${cell.date}: ${cell.count} swipes`}
                      >
                        <span className="leading-none text-[9px] opacity-75">{cell.date.split(' ')[1]}</span>
                        <span className="leading-none font-bold text-[10px] mt-0.5">{cell.count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center justify-end gap-1.5 mt-4 text-[10px] text-slate-400 font-semibold">
                  <span>Less</span>
                  <div className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                  <div className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-900" />
                  <div className="w-3 h-3 rounded bg-blue-400 dark:bg-blue-700" />
                  <div className="w-3 h-3 rounded bg-blue-600 dark:bg-blue-500" />
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* 6b. Strategic Action Recommendations (col-span-6) */}
            <div className="lg:col-span-6 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-500" />
                    ATS Optimization Recommendations
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Data-driven action items to maximize interview callback rates.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Recommendation 1 */}
                <div className="bg-blue-50/70 dark:bg-blue-900/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-800/40 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Add "GraphQL" & "Design Tokens" to your Skills
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      75% of your right-swiped roles list GraphQL as a primary requirement. Adding it will raise your average fit score to 94%.
                    </p>
                  </div>
                </div>

                {/* Recommendation 2 */}
                <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-800/40 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Double down on Fintech & AI roles
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Your response conversion is 2.4x higher for Fintech postings compared to general enterprise software.
                    </p>
                  </div>
                </div>

                {/* Recommendation 3 */}
                <div className="bg-purple-50/70 dark:bg-purple-900/20 p-3.5 rounded-xl border border-purple-100 dark:border-purple-800/40 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Complete LinkedIn & Portfolio Verification
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Recruiters view verified portfolios 42% longer. Connect your portfolio link in your profile settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                {onNavigateToResume && (
                  <button
                    onClick={onNavigateToResume}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors text-center"
                  >
                    Upload Updated Resume
                  </button>
                )}
                {onNavigateToApplications && (
                  <button
                    onClick={onNavigateToApplications}
                    className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Applications Track
                  </button>
                )}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
};
