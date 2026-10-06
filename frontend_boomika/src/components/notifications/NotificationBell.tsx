import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  Sparkles, 
  Zap, 
  Building2, 
  FileCheck, 
  Info, 
  CheckCheck, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Notification, NotificationType } from '../../types';
import { getPostedLabel } from '../../utils/competition';
import { TabType } from '../layout/TopNav';

interface NotificationBellProps {
  onNavigateTab: (tab: TabType) => void;
  onSelectJobId?: (jobId: string | number) => void;
}

export const getNotificationVisuals = (type: NotificationType) => {
  switch (type) {
    case 'high_match':
      return {
        icon: Sparkles,
        bgClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
        label: 'High Match',
      };
    case 'low_competition':
      return {
        icon: Zap,
        bgClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
        badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
        label: 'Low Competition',
      };
    case 'startup_hiring':
      return {
        icon: Building2,
        bgClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
        badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/40',
        label: 'Startup Surge',
      };
    case 'application_status':
      return {
        icon: FileCheck,
        bgClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
        badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/40',
        label: 'Application Status',
      };
    case 'instant_job':
      return {
        icon: ExternalLink,
        bgClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
        badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40',
        label: 'Instant Match',
      };
    case 'system':
    default:
      return {
        icon: Info,
        bgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
        badgeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        label: 'System',
      };
  }
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onNavigateTab,
  onSelectJobId,
}) => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const latestNotifications = notifications.slice(0, 6);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await markRead(notif.id);
    }
    setIsOpen(false);

    if (notif.application_id) {
      onNavigateTab('applications');
    } else if (notif.job_id) {
      if (onSelectJobId) onSelectJobId(notif.job_id);
      onNavigateTab('discover');
    } else {
      onNavigateTab('notifications');
    }
  };

  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div className="relative">
      {/* Trigger Bell Button */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#111827] shadow-xs"
            aria-live="polite"
          >
            {badgeText}
          </span>
        )}
      </button>

      {/* Flyout Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="region"
          aria-label="Notification dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Dropdown Header */}
          <div className="p-3.5 px-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List of Latest Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {latestNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No notifications yet
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You'll be alerted when matching roles or status updates appear.
                </p>
              </div>
            ) : (
              latestNotifications.map((notif) => {
                const visual = getNotificationVisuals(notif.type);
                const IconComponent = visual.icon;
                const postedLabel = getPostedLabel(notif.created_at);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 px-4 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start gap-3 relative ${
                      !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    {/* Visual Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${visual.bgClass}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${visual.badgeClass}`}
                        >
                          {visual.label}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {postedLabel}
                        </span>
                      </div>

                      <h4
                        className={`text-xs mt-1 leading-snug line-clamp-1 ${
                          !notif.read
                            ? 'font-bold text-slate-900 dark:text-white'
                            : 'font-semibold text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {notif.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread indicator blue dot */}
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer view all */}
          <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigateTab('notifications');
              }}
              className="w-full py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>View All Notifications & History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
