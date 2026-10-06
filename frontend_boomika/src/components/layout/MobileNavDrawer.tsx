import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Compass,
  Briefcase,
  Target,
  FileText,
  BarChart2,
  TrendingUp,
  Bell,
  Sliders,
  MessageSquare,
  UserCheck,
  LayoutDashboard,
  PlusCircle,
  Columns3,
  ShieldCheck,
  Settings,
  HelpCircle,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { TabType } from './TopNav';
import { UserRole } from '../../types';
import { API_CONFIG } from '../../config/api';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
}) => {
  const { user, currentRole, logout, switchRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const candidateNavItems = [
    { id: 'discover' as TabType, label: 'Discover Jobs', icon: Compass },
    { id: 'applications' as TabType, label: 'Applications Tracking', icon: Briefcase },
    { id: 'ats-dashboard' as TabType, label: 'ATS Score Matrix', icon: Target },
    { id: 'resume' as TabType, label: 'Resume Versions', icon: FileText },
    { id: 'analytics' as TabType, label: 'Candidate Analytics', icon: BarChart2 },
    { id: 'hiring-trends' as TabType, label: 'Hiring Trends', icon: TrendingUp },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'alert-settings' as TabType, label: 'Alert Settings', icon: Sliders },
    { id: 'messages' as TabType, label: 'Messages', icon: MessageSquare },
    { id: 'profile' as TabType, label: 'Edit Profile', icon: UserCheck },
  ];

  const recruiterNavItems = [
    { id: 'recruiter-dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recruiter-post-job' as TabType, label: 'Post a Job', icon: PlusCircle },
    { id: 'recruiter-pipeline' as TabType, label: 'Candidates Pipeline', icon: Columns3 },
    { id: 'recruiter-jobs' as TabType, label: 'Job Listings', icon: Briefcase },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart2 },
    { id: 'hiring-trends' as TabType, label: 'Hiring Trends', icon: TrendingUp },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'messages' as TabType, label: 'Messages', icon: MessageSquare },
    { id: 'profile' as TabType, label: 'Edit Profile', icon: UserCheck },
  ];

  const adminNavItems = [
    { id: 'admin-analytics' as TabType, label: 'Admin Overview', icon: ShieldCheck },
    { id: 'hiring-trends' as TabType, label: 'Hiring Trends', icon: TrendingUp },
    { id: 'recruiter-pipeline' as TabType, label: 'Pipeline Review', icon: Columns3 },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart2 },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'profile' as TabType, label: 'Edit Profile', icon: UserCheck },
  ];

  const navItems =
    currentRole === 'admin'
      ? adminNavItems
      : currentRole === 'recruiter'
        ? recruiterNavItems
        : candidateNavItems;

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    switchRole(newRole);
    if (newRole === 'admin') {
      onTabChange('admin-analytics');
    } else if (newRole === 'recruiter') {
      onTabChange('recruiter-dashboard');
    } else if (newRole === 'candidate') {
      onTabChange('discover');
    }
    showToast(`Switched active workspace view to ${newRole.toUpperCase()}`, 'info');
  };

  const handleSelectTab = (tab: TabType) => {
    onTabChange(tab);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          data-testid="mobile-nav-drawer"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            data-testid="mobile-nav-backdrop"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative w-80 max-w-[85vw] bg-white dark:bg-[#0B132B] h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10 border-r border-slate-200 dark:border-slate-800"
          >
            {/* Top section */}
            <div className="p-5 space-y-4">
              {/* Header: Brand and Close button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div
                  onClick={() => handleSelectTab(currentRole === 'recruiter' ? 'recruiter-dashboard' : 'discover')}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
                    S
                  </div>
                  <span className="text-xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                    SwipeX
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close menu"
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Mini Card */}
              <div
                onClick={() => handleSelectTab('profile')}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-blue-500 transition-all"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                  <img
                    src={
                      user?.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.name || 'Alex Mercer'}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate">
                    {user?.tier || `${currentRole} Tier 1`}
                  </p>
                </div>
              </div>

              {/* Role Switcher */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Role Gating
                </label>
                <select
                  value={currentRole}
                  onChange={handleRoleChange}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="candidate">Candidate (Job Seeker)</option>
                  <option value="recruiter">Recruiter (Talent Partner)</option>
                  <option value="admin">Platform Admin</option>
                </select>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1 pt-1" aria-label="Mobile primary navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activeTab === item.id ||
                    (item.id === 'applications' && activeTab === 'resume') ||
                    (item.id === 'recruiter-dashboard' && activeTab === 'recruiter-jobs');

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
              {/* Quick Preferences & Theme */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  className="min-h-[40px] flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
                  <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
                </button>

                {API_CONFIG.USE_MOCK && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80">
                    Mock Data
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSelectTab('alert-settings')}
                className="w-full min-h-[40px] flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Alert & Notification Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                  showToast('Signed out of SwipeX workspace', 'info');
                }}
                className="w-full min-h-[40px] flex items-center gap-3 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
