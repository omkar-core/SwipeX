import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Moon, 
  Mail, 
  Smartphone, 
  ShieldCheck, 
  Check, 
  ArrowLeft,
  Sparkles,
  Zap,
  Building2,
  FileCheck,
  Info,
  RotateCcw,
  Save,
  AlertCircle
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { AlertPreferences, NotificationType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { pushService } from '../../services/pushService';

interface AlertPreferencesScreenProps {
  onBack?: () => void;
}

export const AlertPreferencesScreen: React.FC<AlertPreferencesScreenProps> = ({ onBack }) => {
  const { preferences, updatePreferences } = useNotifications();
  const { showToast } = useToast();

  const [formState, setFormState] = useState<AlertPreferences | null>(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (preferences) {
      setFormState(preferences);
    }
  }, [preferences]);

  if (!formState) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">
        Loading preferences...
      </div>
    );
  }

  const isPushEnabledInEnv = pushService.isEnabledInEnv();
  const hasPushCredentials = pushService.hasCredentials();

  // Check dirty state
  const isDirty = JSON.stringify(formState) !== JSON.stringify(preferences);

  const toggleType = (type: NotificationType) => {
    setFormState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        types: {
          ...prev.types,
          [type]: !prev.types[type],
        },
      };
    });
  };

  const toggleChannel = async (channel: 'in_app' | 'email' | 'push') => {
    if (channel === 'push' && isPushEnabledInEnv) {
      const willEnable = !formState.channels.push;
      if (willEnable) {
        const perm = await pushService.requestPermission();
        if (perm === 'granted') {
          await pushService.register();
          showToast('Web push notification permissions granted!', 'success');
        } else {
          showToast('Notification permission was not granted by the browser.', 'warning');
          return;
        }
      }
    }

    setFormState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        channels: {
          ...prev.channels,
          [channel]: !prev.channels[channel],
        },
      };
    });
  };

  const handleReset = () => {
    if (preferences) {
      setFormState(preferences);
      setErrorMsg(null);
      showToast('Restored saved preferences', 'info');
    }
  };

  const handleSave = async () => {
    setErrorMsg(null);

    // Validation: quiet hours start cannot equal end
    if (formState.quiet_hours.enabled && formState.quiet_hours.start === formState.quiet_hours.end) {
      setErrorMsg('Quiet hours start time and end time cannot be identical.');
      return;
    }

    setIsSaving(true);
    try {
      await updatePreferences(formState);
      showToast('Alert preferences saved successfully!', 'success');
    } catch {
      setErrorMsg('Failed to save preferences. Reverted to previous settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
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
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-6 h-6 text-blue-600" />
              Notification & Alert Preferences
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Customize real-time push filters, AI threshold limits, and quiet hours.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
              isDirty && !isSaving
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-6 mt-6">
        {/* Section 1: Alert Categories */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Active Alert Triggers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select which career opportunities trigger instant notification updates.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
            {/* High AI Match */}
            <div
              onClick={() => toggleType('high_match')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formState.types.high_match
                  ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">High AI Match Roles</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Roles meeting or exceeding your target ATS compatibility score.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formState.types.high_match}
                onChange={() => {}}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 pointer-events-none mt-1"
              />
            </div>

            {/* Low Competition */}
            <div
              onClick={() => toggleType('low_competition')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formState.types.low_competition
                  ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Low-Competition Alerts</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Fresh vacancies with fewer than 10 total active applicants.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formState.types.low_competition}
                onChange={() => {}}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 pointer-events-none mt-1"
              />
            </div>

            {/* Startup Surge */}
            <div
              onClick={() => toggleType('startup_hiring')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formState.types.startup_hiring
                  ? 'border-purple-300 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 ring-1 ring-purple-500/20'
                  : 'border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Startup Hiring Spikes</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Fast-growing Seed and Series-A companies expanding engineering teams.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formState.types.startup_hiring}
                onChange={() => {}}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 pointer-events-none mt-1"
              />
            </div>

            {/* Instant Job Alerts */}
            <div
              onClick={() => toggleType('instant_job')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formState.types.instant_job
                  ? 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Instant Job Alerts</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Immediate notification when vacancies matching your target track open.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formState.types.instant_job}
                onChange={() => {}}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 pointer-events-none mt-1"
              />
            </div>

            {/* Application Status Changes */}
            <div
              onClick={() => toggleType('application_status')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formState.types.application_status
                  ? 'border-blue-300 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Application Updates</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Recruiter reviews, shortlist notifications, and interview invitations.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formState.types.application_status}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 pointer-events-none mt-1"
              />
            </div>
          </div>
        </div>

        {/* Section 2: AI Match Score Threshold */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Match Score Threshold</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                You'll receive alerts for opportunities matching <span className="font-bold text-blue-600">{formState.match_threshold}%</span> or higher.
              </p>
            </div>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {formState.match_threshold}%
            </span>
          </div>

          <input
            type="range"
            min="50"
            max="95"
            step="1"
            value={formState.match_threshold}
            onChange={(e) =>
              setFormState((prev) =>
                prev ? { ...prev, match_threshold: Number(e.target.value) } : prev
              )
            }
            className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
          />

          <div className="flex justify-between text-[11px] text-slate-400 font-semibold mt-2">
            <span>50% (Broad Discovery)</span>
            <span className="text-blue-600 font-bold">80% (Recommended)</span>
            <span>95% (Strict Top 5%)</span>
          </div>
        </div>

        {/* Section 3: Delivery Channels & Quiet Hours */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Delivery Channels</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose how you want to receive active alerts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
              {/* In-App */}
              <label className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 cursor-pointer bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">In-App (Bell)</span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.channels.in_app}
                  onChange={() => toggleChannel('in_app')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              {/* Email */}
              <label className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 cursor-pointer bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Email Digest</span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.channels.email}
                  onChange={() => toggleChannel('email')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              {/* Push Notifications */}
              <div className="space-y-2">
                <label
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isPushEnabledInEnv
                      ? 'border-slate-200 dark:border-slate-800 cursor-pointer bg-slate-50/50 dark:bg-slate-800/40'
                      : 'border-slate-200/60 dark:border-slate-800/40 opacity-70 bg-slate-50/30 dark:bg-slate-800/20'
                  }`}
                  title={!isPushEnabledInEnv ? 'Push notifications disabled by admin' : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                        Push Alerts
                      </span>
                      {!isPushEnabledInEnv ? (
                        <span className="text-[10px] text-slate-400 font-medium">In-app only mode</span>
                      ) : !hasPushCredentials ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Local SW mode</span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-medium">Live Web Push</span>
                      )}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isPushEnabledInEnv}
                    checked={formState.channels.push}
                    onChange={() => toggleChannel('push')}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-40"
                  />
                </label>

                {isPushEnabledInEnv && !hasPushCredentials && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 px-1">
                    <Info className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Firebase keys not set; notifications will deliver via local service worker.</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Quiet Hours (Do Not Disturb)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mutes toast popups during specified hours; notifications still save to your inbox.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.quiet_hours.enabled}
                  onChange={(e) =>
                    setFormState((prev) =>
                      prev
                        ? {
                            ...prev,
                            quiet_hours: {
                              ...prev.quiet_hours,
                              enabled: e.target.checked,
                            },
                          }
                        : prev
                    )
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formState.quiet_hours.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Time (Mute from)
                  </label>
                  <input
                    type="time"
                    value={formState.quiet_hours.start}
                    onChange={(e) =>
                      setFormState((prev) =>
                        prev
                          ? {
                              ...prev,
                              quiet_hours: {
                                ...prev.quiet_hours,
                                start: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Time (Resume toast alerts)
                  </label>
                  <input
                    type="time"
                    value={formState.quiet_hours.end}
                    onChange={(e) =>
                      setFormState((prev) =>
                        prev
                          ? {
                              ...prev,
                              quiet_hours: {
                                ...prev.quiet_hours,
                                end: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
