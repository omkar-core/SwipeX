import React from 'react';
import { Zap, Moon, Sun, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_CONFIG } from '../../config/api';
import { NotificationBell } from '../notifications/NotificationBell';


export type TabType = 
  | 'discover' 
  | 'applications' 
  | 'ats-dashboard'
  | 'resume'
  | 'messages' 
  | 'analytics' 
  | 'profile'
  | 'recruiter-dashboard'
  | 'recruiter-post-job'
  | 'recruiter-pipeline'
  | 'recruiter-jobs'
  | 'notifications'
  | 'alert-settings'
  | 'hiring-trends'
  | 'admin-analytics';


interface TopNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenMobileNav?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ activeTab, onTabChange, onOpenMobileNav }) => {
  const { user, currentRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const candidateTabs: { id: TabType; label: string }[] = [
    { id: 'discover', label: 'Discover' },
    { id: 'applications', label: 'Applications' },
    { id: 'ats-dashboard', label: 'ATS Score' },
    { id: 'resume', label: 'Resume' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'hiring-trends', label: 'Hiring Trends' },
    { id: 'messages', label: 'Messages' },
  ];

  const recruiterTabs: { id: TabType; label: string }[] = [
    { id: 'recruiter-dashboard', label: 'Dashboard' },
    { id: 'recruiter-post-job', label: 'Post a Job' },
    { id: 'recruiter-pipeline', label: 'Candidates' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'hiring-trends', label: 'Hiring Trends' },
  ];

  const adminTabs: { id: TabType; label: string }[] = [
    { id: 'admin-analytics', label: 'Admin Overview' },
    { id: 'hiring-trends', label: 'Hiring Trends' },
    { id: 'recruiter-pipeline', label: 'Candidates' },
    { id: 'analytics', label: 'Analytics' },
  ];

  const tabs = currentRole === 'admin' 
    ? adminTabs 
    : currentRole === 'recruiter' 
      ? recruiterTabs 
      : candidateTabs;


  return (
    <header className="w-full bg-white dark:bg-[#111827] border-b border-slate-200/80 dark:border-slate-700/60 sticky top-0 z-30 px-4 sm:px-8 h-16 flex items-center justify-between">

      {/* Brand Logo & Mobile Menu Trigger */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            data-testid="mobile-menu-trigger"
            className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div 
          onClick={() => onTabChange(currentRole === 'recruiter' ? 'recruiter-dashboard' : 'discover')}
          className="flex items-center gap-1.5 cursor-pointer select-none"
        >
          <span className="text-2xl font-black tracking-tight text-[#2563EB]">SwipeX</span>
        </div>
      </div>

      {/* Center Nav Tabs */}
      <nav className="hidden lg:flex items-center gap-8 h-full">
        {tabs.map((tab) => {
          const isActive = 
            activeTab === tab.id || 
            (tab.id === 'applications' && activeTab === 'resume') ||
            (tab.id === 'recruiter-dashboard' && activeTab === 'recruiter-jobs');
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative h-full flex items-center text-sm font-medium transition-colors px-1 cursor-pointer ${
                isActive
                  ? 'text-[#2563EB] font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#2563EB] rounded-t-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Icons & Profile */}
      <div className="flex items-center gap-3 sm:gap-3.5">
        {/* Mock Mode Indicator */}
        {API_CONFIG.USE_MOCK && (
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80 shadow-xs"
            title="Running in mock mode with simulated data. Set VITE_USE_MOCK=false to connect to live backend."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Mock Data
          </span>
        )}

        {/* Real Notification Bell with live count and dropdown */}
        <NotificationBell onNavigateTab={onTabChange} />

        {/* Lightning Bolt Action */}
        <button
          type="button"
          aria-label="Quick Actions"
          className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-full transition-colors cursor-pointer"
        >
          <Zap className="w-5 h-5" />
        </button>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          onClick={toggleTheme}
          title={isDark ? 'Light Mode' : 'Dark Mode'}
          className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-amber-400 hover:text-slate-900 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-full transition-all cursor-pointer"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* User Avatar */}
        <div 
          onClick={() => onTabChange('profile')}
          className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer ring-2 ring-transparent hover:ring-blue-500 transition-all flex-shrink-0"
          title={`${user?.name || 'Alex Mercer'} - Edit Profile`}
        >
          <img
            src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
            alt={user?.name || "User Avatar"}
            className="w-full h-full object-cover"
          />
        </div>

      </div>
    </header>
  );
};
