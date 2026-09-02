import React, { useState } from 'react';
import { TopNav, TabType } from './TopNav';
import { LeftSidebar } from './LeftSidebar';
import { DiscoverScreen } from '../discover/DiscoverScreen';
import { ApplicationsScreen } from '../applications/ApplicationsScreen';
import { UploadResumeScreen } from '../resume/UploadResumeScreen';
import { useAuth } from '../../context/AuthContext';
import { LoginScreen } from '../auth/LoginScreen';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { ProfileEditScreen } from '../profile/ProfileEditScreen';
import { MessageSquare, BarChart3, Users, Building, ShieldAlert, Zap, Sparkles, UserCheck } from 'lucide-react';


export const AppLayout: React.FC = () => {
  const { isAuthenticated, isLoading, currentRole, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [showAuthPreview, setShowAuthPreview] = useState(false);
  // Feature 8: Onboarding Skills Wizard state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('swipex_onboarded') !== 'true';
  });

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

  // Determine if we should show left sidebar (Applications, Resume, Messages, Analytics, Profile)
  const isSidebarLayout = activeTab === 'applications' || activeTab === 'resume' || activeTab === 'messages' || activeTab === 'analytics' || activeTab === 'profile';


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
            className="text-slate-300 hover:text-white underline text-[11px]"
          >
            Switch Account
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex w-full">
        {/* Left Sidebar if in Applications / Resume / Messages / Analytics view */}
        {isSidebarLayout && (
          <div className="hidden md:block">
            <LeftSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-x-hidden">
          {activeTab === 'discover' && <DiscoverScreen />}
          {activeTab === 'applications' && (
            <ApplicationsScreen onNavigateToResume={() => setActiveTab('resume')} />
          )}
          {activeTab === 'resume' && <UploadResumeScreen />}
          {activeTab === 'profile' && (
            <ProfileEditScreen
              onSaved={() => setActiveTab('discover')}
              onCancel={() => setActiveTab('discover')}
            />
          )}
          
          {/* Messages View */}

          {activeTab === 'messages' && (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Direct Recruiter Conversations</h2>
              <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                Once a company accepts your swipe or schedules an interview, their hiring team will connect here directly.
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700"
              >
                Continue Discovering Roles
              </button>
            </div>
          )}

          {/* Analytics View */}
          {activeTab === 'analytics' && (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">ATS Pipeline Analytics</h2>
              <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                Profile view rate: +34% this week. Your resume fit score ranks in the top 5% of Tier 1 Design Talent.
              </p>
              <button
                onClick={() => setActiveTab('applications')}
                className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700"
              >
                View Applications Timeline
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Screen Switcher Floating Bar (for Milestone 1 & 2 review) */}
      <div className="fixed bottom-4 left-4 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur border border-slate-300/80 dark:border-slate-700 shadow-lg rounded-full px-3 py-1.5 flex items-center gap-1 text-xs">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">
          Views:
        </span>
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
          onClick={() => { setShowAuthPreview(false); setActiveTab('applications'); }}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            !showAuthPreview && activeTab === 'applications' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          3. Applications
        </button>
        <button
          onClick={() => { setShowAuthPreview(false); setActiveTab('resume'); }}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            !showAuthPreview && activeTab === 'resume' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          4. Upload Resume
        </button>
        <button
          onClick={() => { setShowAuthPreview(false); setActiveTab('profile'); }}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            !showAuthPreview && activeTab === 'profile' ? 'bg-[#2563EB] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          5. Profile
        </button>
        <button
          onClick={() => setShowOnboarding(true)}
          className="px-2.5 py-1 rounded-full font-semibold transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center gap-1"
          title="Personalize your discovery settings"
        >
          <Sparkles className="w-3 h-3" />
          6. Onboarding
        </button>
      </div>


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

