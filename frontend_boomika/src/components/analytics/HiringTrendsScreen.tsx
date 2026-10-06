import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Calendar,
  Building2,
  Code2,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Layers,
  PieChart
} from 'lucide-react';
import { HiringTrendData, HiringTrendRange } from '../../types/milestone4';
import { ApiService } from '../../services/api';
import { LineAreaChart } from './charts/LineAreaChart';
import { HorizontalBarChart } from './charts/HorizontalBarChart';
import { StackedBarChart } from './charts/StackedBarChart';
import { useToast } from '../../context/ToastContext';

interface HiringTrendsScreenProps {
  onNavigateToJobs?: () => void;
}

export const HiringTrendsScreen: React.FC<HiringTrendsScreenProps> = ({ onNavigateToJobs }) => {
  const { showToast } = useToast();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customError, setCustomError] = useState<string | null>(null);

  const [data, setData] = useState<HiringTrendData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async (showNotice = false) => {
    try {
      if (showNotice) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      let rangeArg: HiringTrendRange = '30d';
      if (timeRange === 'custom') {
        if (customFrom > customTo) {
          setCustomError('"From" date must be earlier than or equal to "To" date.');
          setIsLoading(false);
          return;
        }
        const diffDays = (new Date(customTo).getTime() - new Date(customFrom).getTime()) / (1000 * 3600 * 24);
        if (diffDays > 180) {
          setCustomError('Custom range cannot exceed 180 days.');
          setIsLoading(false);
          return;
        }
        setCustomError(null);
        rangeArg = { from: customFrom, to: customTo };
      } else {
        rangeArg = timeRange;
      }

      const res = await ApiService.getHiringTrends(rangeArg);
      setData(res);
      if (showNotice) {
        showToast('Hiring trends updated with latest industry data!', 'success');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve hiring trends.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange, customFrom, customTo, showToast]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrends(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" data-testid="hiring-trends-screen">
      {/* Header & Date Range Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Market Intelligence & Demand Analytics</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Industry Hiring Velocity & Tech Trends
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time hiring volume across verified companies, high-demand skills, and startup market share.
          </p>
        </div>

        {/* Range Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl shadow-xs">
            {(['7d', '30d', '90d', 'custom'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : 'Custom'}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchTrends(true)}
            disabled={isRefreshing || isLoading}
            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Refresh trends"
            aria-label="Refresh hiring trends"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Form (when timeRange === 'custom') */}
      {timeRange === 'custom' && (
        <form
          onSubmit={handleCustomApply}
          className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 flex flex-wrap items-center gap-4 text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-300">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-300">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
          >
            Apply Range
          </button>

          {customError && (
            <span className="text-rose-600 dark:text-rose-400 font-medium text-xs">
              {customError}
            </span>
          )}
        </form>
      )}

      {/* Error State */}
      {error && (
        <div
          data-testid="hiring-trends-error"
          className="p-6 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchTrends(false)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 h-80 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800" />
            <div className="lg:col-span-4 h-80 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800" />
          </div>
        </div>
      ) : error && !data ? null : data ? (
        <>
          {/* 1. KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                Active Openings
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {(data.kpis?.total_jobs ?? 1840).toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                +{data.kpis?.pct_change ?? 14}% vs previous period
              </span>
            </div>

            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                #1 In-Demand Skill
              </span>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 truncate">
                {data.kpis?.top_skill || data.top_skills[0]?.skill || 'React & TypeScript'}
              </div>
              <span className="text-[11px] text-slate-500 truncate block">
                {data.top_skills[0]?.percentage ?? 86}% of technical job postings
              </span>
            </div>

            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Startup Hiring Share
              </span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {data.kpis?.startup_share_pct ?? 68}%
              </div>
              <span className="text-[11px] text-slate-500 block">
                Seed to Series-B engineering teams
              </span>
            </div>

            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                Enterprise Share
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {100 - (data.kpis?.startup_share_pct ?? 68)}%
              </div>
              <span className="text-[11px] text-slate-500 block">
                Public tech & Fortune 500 companies
              </span>
            </div>
          </div>

          {/* 2. Charts Section: Line Chart & Top Skills Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Job Postings Velocity Line/Area Chart */}
            <div className="lg:col-span-7 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Job Posting Volume Over Time
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    New technical listings indexed across the platform.
                  </p>
                </div>
              </div>

              <LineAreaChart
                data={data.jobs_posted}
                color="#2563EB"
                gradientFrom="rgba(37, 99, 235, 0.35)"
                gradientTo="rgba(37, 99, 235, 0.0)"
                unit="postings"
                ariaLabel="Job posting velocity chart"
              />
            </div>

            {/* Right Column: Top Skills Horizontal Bar Chart */}
            <div className="lg:col-span-5 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-600" />
                    Top In-Demand Technical Skills
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Skills most requested in job specifications.
                  </p>
                </div>
              </div>

              <HorizontalBarChart
                items={data.top_skills}
                barColor="bg-indigo-600 dark:bg-indigo-500"
                ariaLabel="Top in-demand technical skills"
              />
            </div>
          </div>

          {/* 3. Startup vs Enterprise Distribution Stacked Bar Chart */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-600" />
                  Market Segment Breakdown: Startup vs. Enterprise
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Comparison of early-stage/venture-backed startups vs. established corporations.
                </p>
              </div>

              {onNavigateToJobs && (
                <button
                  onClick={onNavigateToJobs}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <span>Explore Open Positions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <StackedBarChart
              data={data.startup_vs_mnc}
              ariaLabel="Startup versus Enterprise hiring volume distribution"
            />
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="py-16 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <TrendingUp className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Market Trends Recorded
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hiring trends will generate automatically as verified company postings are synchronized.
          </p>
        </div>
      )}
    </div>
  );
};
