import React, { useEffect, useState } from 'react';
import { Activity, BriefcaseBusiness, CheckCircle2, ChevronRight, FileText, LayoutDashboard, LogOut, Search, Settings, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api';
import { ApiError } from '../../config/api';
import { AdminAnalyticsData, AdminApplicationRecord, AdminDashboardData, AdminJobRecord, AdminRecruiterRecord, AdminUserRecord } from '../../types';

type AdminPage = 'dashboard' | 'users' | 'recruiters' | 'jobs' | 'applications' | 'reports' | 'settings';

const pageFromPath = (): AdminPage => {
  const value = window.location.pathname.split('/')[2] as AdminPage;
  return ['users', 'recruiters', 'jobs', 'applications', 'reports', 'settings'].includes(value) ? value : 'dashboard';
};

const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString() : 'Not available';
const total = (values: Record<string, number>) => Object.values(values).reduce((sum, value) => sum + value, 0);

export const AdminDashboard: React.FC = () => {
  const { user, currentRole, logout } = useAuth();
  const [page, setPage] = useState<AdminPage>(pageFromPath);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [recruiters, setRecruiters] = useState<AdminRecruiterRecord[]>([]);
  const [jobs, setJobs] = useState<AdminJobRecord[]>([]);
  const [applications, setApplications] = useState<AdminApplicationRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    setSearch('');
    setFilter('');
  }, [page]);

  useEffect(() => {
    if (currentRole !== 'admin') return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        if (page === 'dashboard') setDashboard(await ApiService.getAdminDashboard());
        else if (page === 'reports') setAnalytics(await ApiService.getAdminAnalytics());
        else if (page === 'users') setUsers(await ApiService.getAdminUsers({ search, role: filter }));
        else if (page === 'recruiters') setRecruiters(await ApiService.getAdminRecruiters(search));
        else if (page === 'jobs') setJobs(await ApiService.getAdminJobs({ search, status: filter }));
        else if (page === 'applications') setApplications(await ApiService.getAdminApplications({ search, stage: filter }));
      } catch (reason) {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : 'Unable to load admin data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [page, search, filter, currentRole]);

  const navigate = (next: AdminPage) => {
    window.history.pushState({}, '', next === 'dashboard' ? '/admin/dashboard' : `/admin/${next}`);
    setPage(next);
  };

  if (currentRole !== 'admin') {
    return <div className="min-h-screen grid place-items-center bg-[#F4F7FB] p-6"><div className="max-w-md text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"><ShieldCheck className="mx-auto mb-4 text-red-500" size={40} /><h1 className="text-xl font-bold text-slate-900">Admin access required</h1><p className="mt-2 text-sm text-slate-500">Your account is not authorized to view this area.</p></div></div>;
  }

  const nav = [
    ['dashboard', 'Dashboard', LayoutDashboard], ['users', 'Users', UsersRound], ['recruiters', 'Recruiters', UserRound],
    ['jobs', 'Jobs', BriefcaseBusiness], ['applications', 'Applications', FileText], ['reports', 'Reports / Analytics', Activity], ['settings', 'Settings', Settings],
  ] as const;

  return <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex">
    <aside className="hidden lg:flex w-64 shrink-0 bg-[#101827] text-slate-300 flex-col p-5">
      <div className="text-2xl font-black text-white tracking-tight mb-10">Swipe<span className="text-blue-400">X</span><span className="block text-[10px] tracking-[0.25em] uppercase text-slate-500 mt-1">Admin console</span></div>
      <nav className="space-y-1 flex-1">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => navigate(id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold text-left ${page === id ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}><Icon size={17} />{label}</button>)}</nav>
      <div className="border-t border-white/10 pt-4"><div className="text-xs text-slate-400 truncate mb-3">{user?.name || 'Administrator'}<br /><span className="text-slate-600">{user?.email}</span></div><button onClick={logout} className="flex items-center gap-2 text-sm hover:text-white"><LogOut size={16} /> Sign out</button></div>
    </aside>
    <main className="flex-1 min-w-0">
      <header className="h-16 bg-white border-b border-slate-200 px-5 lg:px-8 flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-blue-600 font-bold">SwipeX control center</p><h1 className="text-lg font-bold">{nav.find(([id]) => id === page)?.[1]}</h1></div><div className="flex items-center gap-3"><span className="hidden sm:block text-xs text-slate-500">{user?.name || 'Administrator'}</span><button onClick={logout} className="lg:hidden p-2 text-slate-600" aria-label="Sign out"><LogOut size={18} /></button></div></header>
      <div className="lg:hidden overflow-x-auto bg-[#101827] px-4 py-2 flex gap-2">{nav.map(([id, label]) => <button key={id} onClick={() => navigate(id)} className={`whitespace-nowrap px-3 py-2 rounded text-xs font-semibold ${page === id ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>{label}</button>)}</div>
      <section className="p-5 lg:p-8 max-w-[1400px] mx-auto">
        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
        {loading && <div className="py-20 text-center text-sm text-slate-500">Loading live platform data...</div>}
        {!loading && page === 'dashboard' && dashboard && <DashboardHome data={dashboard} onNavigate={navigate} />}
        {!loading && page === 'reports' && analytics && <AnalyticsView data={analytics} />}
        {!loading && ['users', 'recruiters', 'jobs', 'applications'].includes(page) && <ManagementView page={page} search={search} filter={filter} setSearch={setSearch} setFilter={setFilter} users={users} recruiters={recruiters} jobs={jobs} applications={applications} />}
        {!loading && page === 'settings' && <SettingsView user={user} />}
      </section>
    </main>
  </div>;
};

const DashboardHome: React.FC<{ data: AdminDashboardData; onNavigate: (page: AdminPage) => void }> = ({ data, onNavigate }) => {
  const cards: Array<[string, number, React.ElementType, string]> = [['Total users', data.total_users, UsersRound, 'All registered accounts'], ['Job seekers', data.total_job_seekers, UserRound, 'Candidate accounts'], ['Recruiters', data.total_recruiters, ShieldCheck, 'Hiring partners'], ['Total jobs', data.total_jobs, BriefcaseBusiness, `${data.active_jobs} active now`], ['Applications', data.total_applications, FileText, 'Across the platform'], ['Pending items', data.pending_items, Activity, 'Needs review']];
  return <><div className="mb-7"><h2 className="text-2xl font-black">Platform overview</h2><p className="text-sm text-slate-500 mt-1">Live operational metrics from the SwipeX database.</p></div><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{cards.map(([label, value, Icon, note]) => <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><div className="flex justify-between"><span className="text-sm text-slate-500">{label}</span><Icon size={20} className="text-blue-600" /></div><div className="text-3xl font-black mt-4">{value}</div><p className="text-xs text-slate-400 mt-1">{note}</p></div>)}</div><div className="mt-8 bg-white border border-slate-200 rounded-xl p-5"><h3 className="font-bold">Platform activity</h3><div className="grid sm:grid-cols-3 gap-3 mt-4">{[['User management', 'Review accounts and roles', 'users'], ['Job moderation', 'Inspect listings and status', 'jobs'], ['Reporting', 'Explore platform distribution', 'reports']].map(([title, note, id]) => <button key={id} onClick={() => onNavigate(id as AdminPage)} className="text-left border border-slate-200 rounded-lg p-4 hover:border-blue-400"><div className="font-semibold text-sm">{title}</div><div className="text-xs text-slate-500 mt-1">{note}</div><ChevronRight size={16} className="mt-3 text-blue-600" /></button>)}</div></div></>;
};

const ManagementView: React.FC<any> = ({ page, search, filter, setSearch, setFilter, users, recruiters, jobs, applications }) => { const records = page === 'users' ? users : page === 'recruiters' ? recruiters : page === 'jobs' ? jobs : applications; const headers = page === 'users' ? ['Name', 'Email', 'Role', 'Status', 'Created'] : page === 'recruiters' ? ['Name', 'Company', 'Jobs', 'Status', 'Created'] : page === 'jobs' ? ['Job', 'Company', 'Status', 'Applications', 'Posted'] : ['Candidate', 'Job', 'Company', 'Stage', 'Applied']; return <><div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"><div><h2 className="text-2xl font-black capitalize">{page}</h2><p className="text-sm text-slate-500 mt-1">Search and inspect live records.</p></div><div className="flex gap-2"><div className="relative"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className="w-48 pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm" /></div>{page !== 'recruiters' && <select value={filter} onChange={(event) => setFilter(event.target.value)} className="border border-slate-200 rounded-lg px-3 text-sm"><option value="">All {page === 'users' ? 'roles' : page === 'jobs' ? 'statuses' : 'stages'}</option>{(page === 'users' ? ['candidate', 'recruiter', 'admin'] : page === 'jobs' ? ['active', 'closed', 'draft'] : ['New', 'Shortlisted', 'Interviewing', 'Offered', 'Rejected']).map((value) => <option key={value}>{value}</option>)}</select>}</div></div><div className="bg-white border border-slate-200 rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headers.map((header) => <th key={header} className="text-left px-5 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{records.map((record: any) => <tr key={record.user_id || record.job_id || record.application_id}><td className="px-5 py-4 font-semibold">{record.name || record.candidate_name || record.title}</td><td className="px-5 py-4">{record.email || record.company || record.company_name || record.job_title}</td><td className="px-5 py-4">{record.role || record.job_count || record.status || record.company}</td><td className="px-5 py-4">{record.status || record.application_count || record.stage || '-'}</td><td className="px-5 py-4 text-slate-500">{formatDate(record.created_at || record.posted_at || record.applied_at)}</td></tr>)}{records.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No records found.</td></tr>}</tbody></table></div></>; };

const AnalyticsView: React.FC<{ data: AdminAnalyticsData }> = ({ data }) => { const groups: Array<[string, Record<string, number>]> = [['User types', data.user_types], ['Job status', data.job_status], ['Application stages', data.application_stages]]; return <><h2 className="text-2xl font-black">Reports & analytics</h2><p className="text-sm text-slate-500 mt-1 mb-7">Current distribution across platform entities.</p><div className="grid lg:grid-cols-3 gap-5">{groups.map(([title, values]) => <div key={title} className="bg-white border border-slate-200 rounded-xl p-5"><h3 className="font-bold mb-5">{title}</h3>{Object.entries(values).map(([label, value]) => <div key={label} className="mb-4"><div className="flex justify-between text-xs mb-1"><span className="capitalize">{label}</span><b>{value}</b></div><div className="h-2 bg-slate-100 rounded-full"><div className="h-2 bg-blue-600 rounded-full" style={{ width: `${Math.min(100, total(values) ? (value / total(values)) * 100 : 0)}%` }} /></div></div>)}</div>)}</div></>; };
const SettingsView: React.FC<{ user: any }> = ({ user }) => <div className="max-w-2xl"><h2 className="text-2xl font-black">Admin settings</h2><p className="text-sm text-slate-500 mt-1 mb-7">Account information and platform access.</p><div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"><div><div className="text-xs uppercase text-slate-400 font-bold">Name</div><div className="mt-1 font-semibold">{user?.name}</div></div><div><div className="text-xs uppercase text-slate-400 font-bold">Email</div><div className="mt-1 font-semibold">{user?.email}</div></div><div><div className="text-xs uppercase text-slate-400 font-bold">Role</div><div className="mt-1 inline-flex items-center gap-2 text-sm text-blue-700"><CheckCircle2 size={16} /> Platform administrator</div></div></div></div>;
