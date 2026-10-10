import React, { useEffect, useState, useCallback } from 'react';
import { Building2, Sparkles, MapPin, Users, Star, ArrowRight, Briefcase, ExternalLink, Filter, Search, Loader2 } from 'lucide-react';
import { Company, CompanyDetail, Job } from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { JobDetailModal } from '../discover/JobDetailModal';

export const CompaniesScreen: React.FC = () => {
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'startups'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApiService.getCompanies({
        newly_founded: activeFilter === 'startups' ? true : undefined,
      });
      setCompanies(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load companies', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, showToast]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSelectCompany = async (companyId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await ApiService.getCompanyById(companyId);
      setSelectedCompany(detail);
    } catch (err: any) {
      showToast(err.message || 'Failed to load company details', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredCompanies = companies.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.industry && c.industry.toLowerCase().includes(q)) ||
      (c.about && c.about.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Discover Companies & Startups
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Explore vetted employers, high-growth startups, and their active engineering openings.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl self-start">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Companies
          </button>
          <button
            onClick={() => setActiveFilter('startups')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'startups'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Startups & Fast Growing
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8 relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by company name, industry, or tech..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-slate-400 shadow-sm"
        />
      </div>

      {/* Grid of Companies */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium">Loading verified companies...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No companies found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try broadening your search term or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <div
              key={company.company_id || company.id || company.name}
              onClick={() => handleSelectCompany(company.company_id || company.id)}
              className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 shadow-subtle hover:shadow-md hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  {company.is_newly_founded && (
                    <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Startup
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {company.name}
                </h3>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                  {company.industry || 'Technology'} • {company.company_type || 'Company'}
                </p>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                  {company.about || 'Innovative employer developing modern software solutions and technology services.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{company.aggregate_rating ?? 4.5}</span>
                  <span>({company.reviews_count ?? 120})</span>
                </div>

                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-1 transition-transform">
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Company Detail Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg">
                  {selectedCompany.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedCompany.name}</h2>
                    {selectedCompany.is_newly_founded && (
                      <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                        Startup
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedCompany.industry} • Team Size: {selectedCompany.size || '50-200'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* About */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About Company</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedCompany.about || 'Pioneering innovative technology platforms and products.'}
              </p>
            </div>

            {/* Active Openings */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Active Job Openings</span>
                <span className="text-blue-600 dark:text-blue-400">{selectedCompany.jobs?.length || 0} Openings</span>
              </h4>

              {(!selectedCompany.jobs || selectedCompany.jobs.length === 0) ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">No open roles currently posted.</p>
              ) : (
                <div className="space-y-3">
                  {selectedCompany.jobs.map((job: any) => (
                    <div
                      key={job.job_id}
                      onClick={() => setSelectedJob(job)}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">{job.title}</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {job.location} • {job.salary_range || 'Competitive'}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        View Role <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedCompany(null)}
                className="px-5 py-2.5 bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isOpen={true}
          onClose={() => setSelectedJob(null)}
          onSave={() => {
            showToast(`Saved ${selectedJob.title} at ${selectedJob.company}!`, 'success');
            setSelectedJob(null);
          }}
          onPass={() => {
            showToast(`Passed on ${selectedJob.company}`, 'info');
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
};
