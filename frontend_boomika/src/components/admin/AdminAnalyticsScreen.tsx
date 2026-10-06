import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  Briefcase,
  FileCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
  PieChart,
  Activity,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminAnalyticsData } from '../../types/milestone4';
import { ApiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const AdminAnalyticsScreen: React.FC = () => {
  const { currentRole } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async (showNotice = false) => {
    try {
      if (showNotice) setIsRefreshing(true);
      else setIsLoading(true);
      const res = await ApiService.getAdminAnalytics();
      setData(res);
      if (showNotice) {
        showToast('Platform telemetry refreshed!', 'success');
      }
    } catch (err) {
      console.warn('Failed to load admin analytics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (currentRole === 'admin') {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [currentRole, loadData]);

  if (currentRole !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center" data-testid="admin-restricted">
        <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          This system intelligence dashboard is reserved exclusively for Platform Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" data-testid="admin-analytics-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
              ADMIN WORKSPACE
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 mt-1">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Platform Administration & System Health
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            System-wide user growth, application processing volume, and recruiter performance benchmarks.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {data.total_users.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">+8.4% this week</span>
            </div>

            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Jobs</span>
                <Briefcase className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {data.active_jobs.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">Across 420 companies</span>
            </div>

            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Applications</span>
                <FileCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {data.total_applications.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">+18.2% this month</span>
            </div>

            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Time-to-Hire</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {data.avg_time_to_hire_days} Days
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">3.8d faster than baseline</span>
            </div>
          </div>

          {/* Demographics & Throughput */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* User Split */}
            <div className="lg:col-span-5 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                User Demographics & Role Distribution
              </h3>

              <div className="space-y-3 pt-2">
                {data.role_split.map((item) => (
                  <div key={item.role} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">{item.role}</span>
                      <span className="text-slate-900 dark:text-white">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.role === 'Candidates'
                            ? 'bg-blue-600'
                            : item.role === 'Recruiters'
                            ? 'bg-purple-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Application Trend */}
            <div className="lg:col-span-7 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                7-Day Platform Throughput (Applications Submitted)
              </h3>

              <div className="flex items-end gap-2 h-44 pt-6 px-2">
                {data.platform_application_trend.map((trend, idx) => {
                  const maxCount = Math.max(...data.platform_application_trend.map(t => t.count), 1);
                  const heightPct = Math.round((trend.count / maxCount) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {trend.count}
                      </span>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-32 flex items-end overflow-hidden">
                        <div
                          className="w-full bg-indigo-600 hover:bg-indigo-500 transition-all rounded-t-lg"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {trend.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
