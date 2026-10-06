import React, { useState, Suspense } from 'react';
import { TopNav, TabType } from './TopNav';
import { LeftSidebar } from './LeftSidebar';
import { MobileNavDrawer } from './MobileNavDrawer';
import { DiscoverScreen } from '../discover/DiscoverScreen';
import { useAuth } from '../../context/AuthContext';
import { LoginScreen } from '../auth/LoginScreen';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { useRecruiter } from '../../context/RecruiterContext';
import { MessageSquare, Zap, Sparkles } from 'lucide-react';

// Code splitting / Lazy-loaded heavy screen modules
const ApplicationsScreen = React.lazy(() =>
  import('../applications/ApplicationsScreen').then((m) => ({ default: m.ApplicationsScreen }))
);
const UploadResumeScreen = React.lazy(() =>
  import('../resume/UploadResumeScreen').then((m) => ({ default: m.UploadResumeScreen }))
);
const ProfileEditScreen = React.lazy(() =>
  import('../profile/ProfileEditScreen').then((m) => ({ default: m.ProfileEditScreen }))
);
const RecruiterDashboard = React.lazy(() =>
  import('../recruiter/RecruiterDashboard').then((m) => ({ default: m.RecruiterDashboard }))
);
const JobPostingForm = React.lazy(() =>
  import('../recruiter/JobPostingForm').then((m) => ({ default: m.JobPostingForm }))
);
const JobPostingsList = React.lazy(() =>
  import('../recruiter/JobPostingsList').then((m) => ({ default: m.JobPostingsList }))
);
const CandidatePipeline = React.lazy(() =>
  import('../recruiter/CandidatePipeline').then((m) => ({ default: m.CandidatePipeline }))
);
const RecruiterAnalytics = React.lazy(() =>
  import('../recruiter/RecruiterAnalytics').then((m) => ({ default: m.RecruiterAnalytics }))
);
const AnalyticsScreen = React.lazy(() =>
  import('../analytics/AnalyticsScreen').then((m) => ({ default: m.AnalyticsScreen }))
);
const AtsScoreDashboard = React.lazy(() =>
  import('../ats/AtsScoreDashboard').then((m) => ({ default: m.AtsScoreDashboard }))
);
const NotificationsScreen = React.lazy(() =>
  import('../notifications/NotificationsScreen').then((m) => ({ default: m.NotificationsScreen }))
);
const AlertPreferencesScreen = React.lazy(() =>
  import('../notifications/AlertPreferencesScreen').then((m) => ({ default: m.AlertPreferencesScreen }))
);
const HiringTrendsScreen = React.lazy(() =>
  import('../analytics/HiringTrendsScreen').then((m) => ({ default: m.HiringTrendsScreen }))
);
const AdminAnalyticsScreen = React.lazy(() =>
  import('../admin/AdminAnalyticsScreen').then((m) => ({ default: m.AdminAnalyticsScreen }))
);

const ScreenSkeleton = () => (
  <div
    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse"
    data-testid="screen-loading-skeleton"
  >
    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    </div>
    <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
  </div>
);

export const AppLayout: React.FC = () => {
  const { isAuthenticated, isLoading, currentRole, logout } = useAuth();
  const { setSelectedJobId } = useRecruiter();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (currentRole === 'admin') return 'admin-analytics';
    if (currentRole === 'recruiter') return 'recruiter-dashboard';
    return 'discover';
  });
  const [showAuthPreview, setShowAuthPreview] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  // Feature 8: Onboarding Skills Wizard state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('swipex_onboarded') !== 'true';
  });

  const showDevTools = import.meta.env.VITE_SHOW_DEV_TOOLS === 'true' && !import.meta.env.PROD;

  // Sync default tab if currentRole changes
  React.useEffect(() => {
    if (currentRole === 'admin') {
      setActiveTab(prev => 
        prev === 'discover' || prev === 'applications' || prev === 'resume' || prev === 'ats-dashboard'
          ? 'admin-analytics' 
          : prev
      );
    } else if (currentRole === 'recruiter') {
      setActiveTab(prev => 
        prev === 'discover' || prev === 'applications' || prev === 'resume' || prev === 'ats-dashboard' || prev === 'admin-analytics'
          ? 'recruiter-dashboard' 
          : prev
      );
    } else if (currentRole === 'candidate') {
      setActiveTab(prev => 
        prev === 'recruiter-dashboard' || prev === 'recruiter-post-job' || prev === 'recruiter-pipeline' || prev === 'recruiter-jobs' || prev === 'admin-analytics'
          ? 'discover' 
          : prev
      );
    }
  }, [currentRole]);

  // Loading state while checking token
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080E2A] flex flex-col items-center justify-center text-white">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-8 h-8 text-blue-500 fill-blue-500 animate-pulse" />
          <span className="text-3xl font-black tracking-tight">SwipeX</span>
        </div>
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-medium text-slate-400">Verifying session...</p>
      </div>
    );
  }

  // REQUIREMENT 1: Require explicit authentication before entering workspace
  if (!isAuthenticated || showAuthPreview) {
    return (
      <div>
        {showAuthPreview && (
          <div className="fixed top-4 right-4 z-50">
            <button
              onClick={() => setShowAuthPreview(false)}
              className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md shadow-md hover:bg-slate-800 font-semibold"
            >
              ← Back to Workspace
            </button>
          </div>
        )}
        <LoginScreen onSuccess={() => setShowAuthPreview(false)} />
      </div>
    );
  }

  // Determine if we should show left sidebar
  const isSidebarLayout = 
    activeTab === 'applications' || 
    activeTab === 'ats-dashboard' ||
    activeTab === 'resume' || 
    activeTab === 'messages' || 
    activeTab === 'analytics' || 
    activeTab === 'profile' ||
    activeTab === 'recruiter-dashboard' ||
    activeTab === 'recruiter-post-job' ||
    activeTab === 'recruiter-pipeline' ||
    activeTab === 'recruiter-jobs' ||
    activeTab === 'notifications' ||
    activeTab === 'alert-settings' ||
    activeTab === 'hiring-trends' ||
    activeTab === 'admin-analytics';


  return (
    <div className="min-h-screen bg-[#F4F7FB] dark:bg-[#0F1629] flex flex-col font-sans">
      {/* Role Notice Banner (if logged in as Recruiter or Admin) */}
      {currentRole !== 'candidate' && (
        <div className="bg-slate-900 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded">
              {currentRole.toUpperCase()} VIEW
            </span>
            <span>
              {currentRole === 'recruiter' 
                ? 'Managing candidate talent pipeline and automated ATS matching.' 
                : 'Platform Administrator with system-wide analytics access.'}
            </span>
          </div>
          <button 
            onClick={logout}
            className="text-slate-300 hover:text-white underline text-[11px] cursor-pointer"
          >
            Switch Account
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <TopNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
      />

      {/* Mobile Slide-In Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 flex w-full">
        {/* Left Sidebar if in Applications / Resume / Messages / Analytics / Recruiter view */}
        {isSidebarLayout && (
          <div className="hidden lg:block">
            <LeftSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-x-hidden">
          <Suspense fallback={<ScreenSkeleton />}>
            {/* Admin-Facing Views */}
          {currentRole === 'admin' ? (
            <>
              {(activeTab === 'admin-analytics' || activeTab === 'discover' || activeTab === 'recruiter-dashboard') && (
                <AdminAnalyticsScreen />
              )}
              {activeTab === 'hiring-trends' && (
                <HiringTrendsScreen onNavigateToJobs={() => setActiveTab('discover')} />
              )}
              {activeTab === 'recruiter-pipeline' && (
                <CandidatePipeline />
              )}
              {activeTab === 'analytics' && (
                <RecruiterAnalytics />
              )}
              {activeTab === 'notifications' && (
                <NotificationsScreen onNavigateToSettings={() => setActiveTab('alert-settings')} />
              )}
              {activeTab === 'alert-settings' && (
                <AlertPreferencesScreen onBack={() => setActiveTab('admin-analytics')} />
              )}
              {activeTab === 'profile' && (
                <ProfileEditScreen
                  onSaved={() => setActiveTab('admin-analytics')}
                  onCancel={() => setActiveTab('admin-analytics')}
                />
              )}
            </>
          ) : currentRole === 'recruiter' ? (
            /* Recruiter-Facing Views */
            <>
              {(activeTab === 'recruiter-dashboard' || activeTab === 'discover' || activeTab === 'applications' || activeTab === 'resume') && (
                <RecruiterDashboard
                  onNavigateToPostJob={() => setActiveTab('recruiter-post-job')}
                  onNavigateToPipeline={(jobId) => {
                    if (jobId) setSelectedJobId(jobId);
                    setActiveTab('recruiter-pipeline');
                  }}
                  onNavigateToJobs={() => setActiveTab('recruiter-jobs')}
                />
              )}
              {activeTab === 'recruiter-post-job' && (
                <JobPostingForm
                  onSuccess={() => setActiveTab('recruiter-jobs')}
                  onCancel={() => setActiveTab('recruiter-dashboard')}
                />
              )}
              {activeTab === 'recruiter-pipeline' && (
                <CandidatePipeline />
              )}
              {activeTab === 'recruiter-jobs' && (
                <JobPostingsList
                  onSelectJob={(jobId) => {
                    setSelectedJobId(jobId);
                    setActiveTab('recruiter-pipeline');
                  }}
                  onNewJob={() => setActiveTab('recruiter-post-job')}
                />
              )}
              {activeTab === 'analytics' && (
                <RecruiterAnalytics />
              )}
              {activeTab === 'hiring-trends' && (
                <HiringTrendsScreen onNavigateToJobs={() => setActiveTab('recruiter-jobs')} />
              )}
              {activeTab === 'notifications' && (
                <NotificationsScreen onNavigateToSettings={() => setActiveTab('alert-settings')} />
              )}
              {activeTab === 'alert-settings' && (
                <AlertPreferencesScreen onBack={() => setActiveTab('recruiter-dashboard')} />
              )}
              {activeTab === 'profile' && (
                <ProfileEditScreen
                  onSaved={() => setActiveTab('recruiter-dashboard')}
                  onCancel={() => setActiveTab('recruiter-dashboard')}
                />
              )}
              {activeTab === 'messages' && (
                <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Direct Candidate Inquiries</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-md mx-auto">
                    Direct candidate messages, interview confirmations, and negotiation notes appear here in real-time.
                  </p>
                  <button
                    onClick={() => setActiveTab('recruiter-pipeline')}
                    className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Open Candidate Pipeline
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Candidate-Facing Views */
            <>
              {activeTab === 'discover' && <DiscoverScreen />}
              {activeTab === 'applications' && (
                <ApplicationsScreen onNavigateToResume={() => setActiveTab('resume')} />
              )}
              {activeTab === 'ats-dashboard' && (
                <AtsScoreDashboard
                  onNavigateToResume={() => setActiveTab('resume')}
                  onNavigateToJobs={() => setActiveTab('discover')}
                />
              )}
              {activeTab === 'resume' && (
                <UploadResumeScreen onNavigateToAts={() => setActiveTab('ats-dashboard')} />
              )}
              {activeTab === 'profile' && (
                <ProfileEditScreen
                  onSaved={() => setActiveTab('discover')}
                  onCancel={() => setActiveTab('discover')}
                />
              )}
              {activeTab === 'notifications' && (
                <NotificationsScreen
                  onNavigateToJob={() => setActiveTab('discover')}
                  onNavigateToApplications={() => setActiveTab('applications')}
                  onNavigateToSettings={() => setActiveTab('alert-settings')}
                />
              )}
              {activeTab === 'alert-settings' && (
                <AlertPreferencesScreen onBack={() => setActiveTab('discover')} />
              )}
              {activeTab === 'hiring-trends' && (
                <HiringTrendsScreen onNavigateToJobs={() => setActiveTab('discover')} />
              )}
              {activeTab === 'messages' && (
                <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Direct Recruiter Conversations</h2>
                  <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                    Once a company accepts your swipe or schedules an interview, their hiring team will connect here directly.
                  </p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                  >
                    Continue Discovering Roles
                  </button>
                </div>
              )}
              {activeTab === 'analytics' && (
                <AnalyticsScreen
                  onNavigateToApplications={() => setActiveTab('applications')}
                  onNavigateToResume={() => setActiveTab('resume')}
                />
              )}
            </>
          )}
          </Suspense>
        </main>
      </div>

      {/* Screen Switcher Floating Bar (for dev review only) */}
      {showDevTools && (
        <div
          data-testid="dev-tools-switcher"
          className="fixed bottom-4 left-4 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur border border-slate-300/80 dark:border-slate-700 shadow-lg rounded-full px-3 py-1.5 flex items-center gap-1 text-xs"
        >
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">
            {currentRole === 'recruiter' ? 'Recruiter:' : 'Candidate:'}
          </span>
          
          {currentRole === 'recruiter' ? (
            <>
              <button
                onClick={() => { setShowAuthPreview(false); setActiveTab('recruiter-dashboard'); }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  !showAuthPreview && activeTab === 'recruiter-dashboard' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                1. Dashboard
              </button>
              <button
                onClick={() => { setShowAuthPreview(false); setActiveTab('recruiter-post-job'); }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  !showAuthPreview && activeTab === 'recruiter-post-job' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                2. Post a Job
              </button>
              <button
                onClick={() => { setShowAuthPreview(false); setActiveTab('recruiter-pipeline'); }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  !showAuthPreview && activeTab === 'recruiter-pipeline' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                3. Candidates
              </button>
              <button
                onClick={() => { setShowAuthPreview(false); setActiveTab('recruiter-jobs'); }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  !showAuthPreview && activeTab === 'recruiter-jobs' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                4. My Listings
              </button>
              <button
                onClick={() => { setShowAuthPreview(false); setActiveTab('analytics'); }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  !showAuthPreview && activeTab === 'analytics' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                5. Analytics
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAuthPreview(true)}
                className="px-2.5 py-1 rounded-full font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                1. Login
              </button>
              <button
                onClick={() => { setShowAuthPreview(false); setActiveTab('discover'); }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  !showAuthPreview && activeTab === 'discover' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                2. Discover (Swipe)
              </button>
              <button
                onClick={() => { setShowAuthPreview(false); setActiveTab('ats-dashboard'); }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  !showAuthPreview && activeTab === 'ats-dashboard' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                3. ATS Score Matrix
              </button>
              <button
                onClick={() => { setShowAuthPreview(false); setActiveTab('resume'); }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  !showAuthPreview && activeTab === 'resume' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                4. Resume Versions
              </button>
              <button
                onClick={() => { setShowAuthPreview(false); setActiveTab('applications'); }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  !showAuthPreview && activeTab === 'applications' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                5. Pipeline
              </button>
              <button
                onClick={() => { setShowAuthPreview(false); setActiveTab('analytics'); }}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  !showAuthPreview && activeTab === 'analytics' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                6. Analytics
              </button>
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-2.5 py-1 rounded-full font-semibold transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center gap-1"
                title="Personalize your discovery settings"
              >
                <Sparkles className="w-3 h-3" />
                7. Onboarding
              </button>
            </>
          )}
        </div>
      )}


      {/* Feature 8 — Onboarding Skills Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => {
            localStorage.setItem('swipex_onboarded', 'true');
            setShowOnboarding(false);
          }}
          onSkip={() => {
            localStorage.setItem('swipex_onboarded', 'true');
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
};

