import React, { useState, useMemo } from 'react';
import {
  Mail,
  Eye,
  CheckSquare,
  Trophy,
  XCircle,
  FileCode,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
  GripVertical,
  Clock,
  Building2,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { ApplicationItem, ApplicationStatus } from '../../types/milestone4';
import { applicationService } from '../../services/applicationService';
import { STATUS_CONFIG, isValidTransition } from '../../utils/applicationStatus';
import { AiMatchBadge } from '../discover/AiMatchBadge';
import { ApplicationHistoryDrawer } from './ApplicationHistoryDrawer';
import { useToast } from '../../context/ToastContext';

interface ApplicationTrackingBoardProps {
  applications: ApplicationItem[];
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

interface ColumnDef {
  id: ApplicationStatus;
  label: string;
  icon: React.ReactNode;
  headerColor: string;
  lightBg: string;
  darkBg: string;
  badgeBg: string;
}

const KANBAN_COLUMNS: ColumnDef[] = [
  {
    id: 'applied',
    label: 'Applied',
    icon: <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    headerColor: 'border-blue-500',
    lightBg: 'bg-blue-50/40',
    darkBg: 'dark:bg-blue-950/20',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
  },
  {
    id: 'under_review',
    label: 'Under Review',
    icon: <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
    headerColor: 'border-purple-500',
    lightBg: 'bg-purple-50/40',
    darkBg: 'dark:bg-purple-950/20',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
  },
  {
    id: 'interviewing',
    label: 'Interviewing',
    icon: <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    headerColor: 'border-amber-500',
    lightBg: 'bg-amber-50/40',
    darkBg: 'dark:bg-amber-950/20',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  },
  {
    id: 'technical_assessment',
    label: 'Tech Assessment',
    icon: <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    headerColor: 'border-indigo-500',
    lightBg: 'bg-indigo-50/40',
    darkBg: 'dark:bg-indigo-950/20',
    badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
  },
  {
    id: 'offer_extended',
    label: 'Offer Extended',
    icon: <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    headerColor: 'border-emerald-500',
    lightBg: 'bg-emerald-50/40',
    darkBg: 'dark:bg-emerald-950/20',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
  {
    id: 'rejected',
    label: 'Archived / Rejected',
    icon: <XCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />,
    headerColor: 'border-slate-400',
    lightBg: 'bg-slate-50/40',
    darkBg: 'dark:bg-slate-900/30',
    badgeBg: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
];

export const ApplicationTrackingBoard: React.FC<ApplicationTrackingBoardProps> = ({
  applications,
  onRefresh,
  isLoading = false,
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ApplicationStatus | null>(null);

  // Filter applications by search query
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return applications;
    const q = searchQuery.toLowerCase();
    return applications.filter(
      (app) =>
        app.company.toLowerCase().includes(q) ||
        app.title.toLowerCase().includes(q) ||
        (app.location && app.location.toLowerCase().includes(q))
    );
  }, [applications, searchQuery]);

  // Group by status column
  const appsByColumn = useMemo(() => {
    const map: Record<ApplicationStatus, ApplicationItem[]> = {
      saved: [],
      applied: [],
      under_review: [],
      shortlisted: [],
      interview: [],
      interviewing: [],
      technical_assessment: [],
      offered: [],
      offer_extended: [],
      rejected: [],
      withdrawn: [],
    };

    filteredApps.forEach((app) => {
      if (map[app.status]) {
        map[app.status].push(app);
      } else {
        map.applied.push(app);
      }
    });

    return map;
  }, [filteredApps]);

  const handleStatusUpdate = async (
    appId: string,
    newStatus: ApplicationStatus,
    note?: string
  ) => {
    try {
      const updated = await applicationService.updateStatus(appId, newStatus, note, 'candidate');
      await onRefresh();
      setSelectedApp(updated);
      showToast(`Stage updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update application status.', 'error');
    }
  };

  const handleWithdraw = async (appId: string, reason?: string) => {
    try {
      const updated = await applicationService.withdrawApplication(appId, reason);
      await onRefresh();
      setSelectedApp(updated);
      showToast('Application withdrawn successfully.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to withdraw application.', 'error');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedAppId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, colId: ApplicationStatus) => {
    e.preventDefault();
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColId: ApplicationStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = draggedAppId || e.dataTransfer.getData('text/plain');
    if (!id) return;

    const app = applications.find((a) => a.id === id);
    if (!app || app.status === targetColId) return;

    if (!isValidTransition(app.status, targetColId)) {
      showToast(
        `Direct jump from ${STATUS_CONFIG[app.status]?.label} to ${STATUS_CONFIG[targetColId]?.label} is not permitted.`,
        'warning'
      );
      return;
    }

    try {
      await applicationService.updateStatus(
        id,
        targetColId,
        `Moved to ${STATUS_CONFIG[targetColId]?.label} via tracking board.`,
        'candidate'
      );
      await onRefresh();
      showToast(`Updated to ${STATUS_CONFIG[targetColId]?.label}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to move application stage.', 'error');
    } finally {
      setDraggedAppId(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="application-tracking-board">
      {/* Board Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter applications by role, company, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {filteredApps.length} Total Applications
          </span>
          <button
            onClick={() => onRefresh()}
            disabled={isLoading}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Refresh pipeline status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 6-Column Kanban Grid */}
      <div className="flex lg:grid lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth">
        {KANBAN_COLUMNS.map((col) => {
          const colApps = appsByColumn[col.id] || [];
          const isDragTarget = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`min-w-[280px] sm:min-w-[320px] lg:min-w-0 snap-start shrink-0 lg:shrink rounded-2xl border transition-all duration-200 flex flex-col min-h-[420px] max-h-[720px] ${
                isDragTarget
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/60 dark:bg-blue-950/40'
                  : 'border-slate-200/90 dark:border-slate-800/90 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xs shadow-xs'
              }`}
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 border-t-4 ${col.headerColor}`}>
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800">
                    {col.icon}
                  </div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {col.label}
                  </h3>
                </div>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                  {colApps.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {colApps.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-center p-3 text-center text-[11px] font-semibold text-slate-400">
                    No applications in this stage
                  </div>
                ) : (
                  colApps.map((app) => (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                      onClick={() => setSelectedApp(app)}
                      className="group bg-white dark:bg-[#151D30] p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800/90 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer space-y-2.5 relative"
                      data-testid={`app-card-${app.id}`}
                    >
                      {/* Drag Handle Indicator */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{app.company}</span>
                          </span>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate pt-0.5 group-hover:text-blue-600 transition-colors">
                            {app.title}
                          </h4>
                        </div>

                        {(app.match_score ?? app.match_percentage) !== undefined && (
                          <AiMatchBadge match_percentage={app.match_score ?? app.match_percentage} size="sm" />
                        )}
                      </div>

                      {/* Location & Salary */}
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 space-y-0.5">
                        {app.location && (
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{app.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Info: Updates count & Timestamp */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(app.updated_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold">
                          {app.status_history?.length || 1} logs
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* History & Status Detail Drawer */}
      <ApplicationHistoryDrawer
        application={selectedApp}
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        onStatusChange={handleStatusUpdate}
        onWithdraw={handleWithdraw}
      />
    </div>
  );
};
