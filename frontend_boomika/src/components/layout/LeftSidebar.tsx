import { 
  Compass, 
  Briefcase, 
  MessageSquare, 
  BarChart2, 
  Settings, 
  HelpCircle,
  LogOut,
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  PlusCircle,
  Columns3,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TabType } from './TopNav';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';

interface LeftSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeTab, onTabChange }) => {
  const { user, currentRole, logout, switchRole } = useAuth();
  const { showToast } = useToast();

  const candidateNavItems = [
    { id: 'discover' as TabType, label: 'Discover', icon: Compass },
    { id: 'applications' as TabType, label: 'Applications', icon: Briefcase },
    { id: 'profile' as TabType, label: 'Edit Profile', icon: UserCheck },
    { id: 'messages' as TabType, label: 'Messages', icon: MessageSquare },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart2 },
  ];

  const recruiterNavItems = [
    { id: 'recruiter-dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recruiter-post-job' as TabType, label: 'Post a Job', icon: PlusCircle },
    { id: 'recruiter-pipeline' as TabType, label: 'Candidates (Pipeline)', icon: Columns3 },
    { id: 'recruiter-jobs' as TabType, label: 'My Job Listings', icon: Briefcase },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart2 },
    { id: 'messages' as TabType, label: 'Messages', icon: MessageSquare },
    { id: 'profile' as TabType, label: 'Edit Profile', icon: UserCheck },
  ];

  const navItems = currentRole === 'recruiter' ? recruiterNavItems : candidateNavItems;

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    switchRole(newRole);
    if (newRole === 'recruiter') {
      onTabChange('recruiter-dashboard');
    } else if (newRole === 'job_seeker') {
      onTabChange('discover');
    }
    showToast(`Switched active workspace view to ${newRole.toUpperCase()}`, 'info');
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-[#F0F6FB] dark:bg-[#0B132B] border-r border-[#E2EAF2] dark:border-slate-800 min-h-[calc(100vh-4rem)] flex flex-col justify-between p-5 select-none">
      <div>
        {/* Logo in Sidebar */}
        <div 
          onClick={() => onTabChange('discover')}
          className="mb-6 cursor-pointer"
        >
          <span className="text-2xl font-black tracking-tight text-[#2563EB]">SwipeX</span>
        </div>

        {/* User Mini-Card / Professional Hub */}
        <div className="bg-transparent mb-5">
          <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => onTabChange('profile')}>
            <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                {user?.name || 'Alex Mercer'}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium capitalize">
                  {user?.tier || `${currentRole} Tier 1`}
                </span>
              </div>
            </div>
          </div>


          {/* Role Gating Indicator & Selector */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Active Role Gating
            </label>
            <div className="relative">
              <select
                value={currentRole}
                onChange={handleRoleChange}
                className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-subtle"
              >
                <option value="job_seeker">Candidate (Job Seeker)</option>
                <option value="recruiter">Recruiter (Talent Partner)</option>
                <option value="admin">Platform Admin</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => showToast('Upgraded to SwipeX Tier 1 Pro!', 'success')}
            className="w-full py-2 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer text-center"
          >
            Upgrade to Pro
          </button>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1.5 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'applications' && activeTab === 'resume');
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#2563EB] text-white font-semibold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Nav */}
      <div className="pt-4 border-t border-[#E2EAF2] space-y-1">
        <button
          type="button"
          onClick={() => showToast('Settings: Configured for backend endpoint ' + (import.meta.env.VITE_BASE_API_URL || 'http://localhost:8000/api/v1'), 'info')}
          className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span>Settings</span>
        </button>
        
        <button
          type="button"
          onClick={() => showToast('Help & Support: 24/7 priority concierge active', 'info')}
          className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <span>Support</span>
        </button>

        <button
          type="button"
          onClick={() => {
            logout();
            showToast('Signed out of SwipeX workspace', 'info');
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
