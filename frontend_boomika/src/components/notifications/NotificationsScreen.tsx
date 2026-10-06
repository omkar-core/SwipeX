import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Filter, 
  ArrowLeft, 
  Sliders, 
  Check, 
  ExternalLink,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Notification, NotificationType } from '../../types';
import { getNotificationVisuals } from './NotificationBell';
import { getPostedLabel } from '../../utils/competition';

interface NotificationsScreenProps {
  onBack?: () => void;
  onNavigateToJob?: (jobId: string | number) => void;
  onNavigateToApplications?: () => void;
  onNavigateToSettings?: () => void;
}

type FilterCategory = 'all' | NotificationType;

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
  onNavigateToJob,
  onNavigateToApplications,
  onNavigateToSettings,
}) => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [referenceTime] = useState<number>(() => Date.now());

  // Filter list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (unreadOnly && notif.read) return false;
      if (selectedFilter !== 'all' && notif.type !== selectedFilter) return false;
      return true;
    });
  }, [notifications, selectedFilter, unreadOnly]);

  // Group notifications chronologically: Today, Yesterday, Earlier
  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const earlier: Notification[] = [];

    filteredNotifications.forEach((notif) => {
      const time = new Date(notif.created_at).getTime();
      const diffHours = (referenceTime - time) / (1000 * 60 * 60);

      if (diffHours < 24) {
        today.push(notif);
      } else if (diffHours < 48) {
        yesterday.push(notif);
      } else {
        earlier.push(notif);
      }
    });

    return { today, yesterday, earlier };
  }, [filteredNotifications, referenceTime]);

  const filterTabs: Array<{ id: FilterCategory; label: string }> = [
    { id: 'all', label: 'All Alerts' },
    { id: 'high_match', label: '🎯 High AI Match' },
    { id: 'low_competition', label: '⚡ Low Competition' },
    { id: 'application_status', label: '📋 Status Changes' },
    { id: 'startup_hiring', label: '🏢 Startup Hiring' },
    { id: 'instant_job', label: '🚀 Instant Jobs' },
    { id: 'system', label: '🔔 System' },
  ];

  const handleAction = (notif: Notification) => {
    if (!notif.read) {
      markRead(notif.id);
    }

    if (notif.application_id && onNavigateToApplications) {
      onNavigateToApplications();
    } else if (notif.job_id && onNavigateToJob) {
      onNavigateToJob(notif.job_id);
    }
  };

  const renderSection = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3 mb-6">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
          {title} ({items.length})
        </h2>

        <div className="space-y-3">
          {items.map((notif) => {
            const visual = getNotificationVisuals(notif.type);
            const IconComponent = visual.icon;
            const postedLabel = getPostedLabel(notif.created_at);

            return (
              <div
                key={notif.id}
                className={`bg-white dark:bg-[#111827] rounded-2xl border transition-all p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  !notif.read
                    ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10 ring-1 ring-blue-500/20'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                {/* Left content */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${visual.bgClass}`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border ${visual.badgeClass}`}
                      >
                        {visual.label}
                      </span>
                      {notif.match_percentage && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                          {notif.match_percentage}% ATS Match
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-medium">
                        {postedLabel}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      )}
                    </div>

                    <h3
                      className={`text-sm mt-1.5 leading-snug ${
                        !notif.read
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'font-semibold text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {notif.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {!notif.read && (
                    <button
                      type="button"
                      onClick={() => markRead(notif.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Mark as Read
                    </button>
                  )}

                  {(notif.job_id || notif.application_id) && (
                    <button
                      type="button"
                      onClick={() => handleAction(notif)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{notif.application_id ? 'View Pipeline' : 'View Job'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-6 h-6 text-blue-600" />
                Notification Center
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Live updates on application status changes, high-match roles, and fast-track hiring alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Alert Preferences</span>
            </button>
          )}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Unread Only Toggle */}
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
          <span>Unread only</span>
        </label>
      </div>

      {/* Notifications List Grouped Chronologically */}
      <div className="mt-6">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-12 text-center shadow-xs">
            <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No notifications found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {unreadOnly
                ? 'All caught up! No unread notifications for the selected category.'
                : 'No alerts found in this category yet. Check back when new matching roles are posted.'}
            </p>
            {(selectedFilter !== 'all' || unreadOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('all');
                  setUnreadOnly(false);
                }}
                className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {renderSection('Today', groupedNotifications.today)}
            {renderSection('Yesterday', groupedNotifications.yesterday)}
            {renderSection('Earlier', groupedNotifications.earlier)}
          </>
        )}
      </div>
    </div>
  );
};
