import React, { useState } from 'react';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Building2, 
  Sparkles, 
  X, 
  Plus, 
  ArrowRight, 
  Check,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useRecruiter } from '../../context/RecruiterContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CreateJobInput, JobStatus } from '../../types';

interface JobPostingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const COMMON_SKILLS = [
  'React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'Figma', 
  'Design Systems', 'Go', 'Python', 'FastAPI', 'PostgreSQL', 
  'Docker', 'Kubernetes', 'AWS', 'GraphQL', 'Node.js'
];

const INDUSTRIES = [
  'Technology', 'Financial Services', 'Healthcare', 'Artificial Intelligence',
  'E-commerce', 'Developer Tools', 'Cybersecurity', 'Enterprise Software'
];

export const JobPostingForm: React.FC<JobPostingFormProps> = ({ onSuccess, onCancel }) => {
  const { createJob, isLoading } = useRecruiter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState(user?.company_name || 'SwipeX Talent Network');
  const [location, setLocation] = useState('San Francisco, CA (Hybrid)');
  const [workEnvironment, setWorkEnvironment] = useState<'Remote' | 'Hybrid' | 'On-site'>('Hybrid');
  const [industry, setIndustry] = useState('Technology');
  const [jobType, setJobType] = useState('Full-time');
  const [salaryMin, setSalaryMin] = useState<number>(140000);
  const [salaryMax, setSalaryMax] = useState<number>(185000);
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>(['React', 'TypeScript', 'Tailwind CSS']);
  const [skillInput, setSkillInput] = useState('');
  const [status, setStatus] = useState<JobStatus>('active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    if (skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Skill already added', 'info');
      return;
    }
    setSkills([...skills, trimmed]);
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Job title is required';
    if (!company.trim()) newErrors.company = 'Company name is required';
    if (!location.trim()) newErrors.location = 'Location is required';
    if (salaryMin <= 0) newErrors.salaryMin = 'Minimum salary must be greater than 0';
    if (salaryMax < salaryMin) newErrors.salaryMax = 'Max salary cannot be less than minimum';
    if (skills.length === 0) newErrors.skills = 'Add at least one required skill';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please correct the highlighted errors', 'error');
      return;
    }

    const payload: CreateJobInput = {
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_range: `$${Math.round(salaryMin / 1000)}k-$${Math.round(salaryMax / 1000)}k`,
      work_environment: workEnvironment,
      industry,
      job_type: jobType,
      description: description.trim() || `Exciting opportunity for a ${title} at ${company}. Work on cutting-edge systems with an exceptional engineering and product team.`,
      skills,
      status,
    };

    try {
      await createJob(payload);
      if (onSuccess) onSuccess();
    } catch {
      // Error handled by context
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Recruiter Workspace</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Create New Job Posting
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Publish listings to candidate discovery decks with automated ATS affinity scoring.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ← Cancel & Back
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column (8 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 sm:p-8 shadow-subtle space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Role & Company Details
            </h3>

            {/* Job Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Job Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer, Lead Product Designer"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-slate-900 dark:text-white bg-white dark:bg-[#0B132B] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 shadow-subtle ${
                  errors.title ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700/80'
                }`}
              />
              {errors.title && (
                <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.title}
                </p>
              )}
            </div>

            {/* Company & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Company Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Nexus Technologies"
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-slate-900 dark:text-white bg-white dark:bg-[#0B132B] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 shadow-subtle ${
                      errors.company ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700/80'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Location *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. New York, NY or Remote, US"
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-slate-900 dark:text-white bg-white dark:bg-[#0B132B] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 shadow-subtle ${
                      errors.location ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700/80'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Work Environment & Industry */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Work Environment
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(['Remote', 'Hybrid', 'On-site'] as const).map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setWorkEnvironment(env)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                        workEnvironment === env
                          ? 'bg-white dark:bg-[#111827] text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0B132B] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-subtle cursor-pointer"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Employment Type
                </label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0B132B] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-subtle cursor-pointer"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>

            {/* Compensation Range */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Annual Salary Range (USD)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(Number(e.target.value))}
                    step={5000}
                    min={30000}
                    className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-[#0B132B] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-subtle"
                  />
                  <span className="text-[10px] font-medium text-slate-400 absolute right-3 top-3">Min/yr</span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(Number(e.target.value))}
                    step={5000}
                    min={30000}
                    className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-[#0B132B] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-subtle"
                  />
                  <span className="text-[10px] font-medium text-slate-400 absolute right-3 top-3">Max/yr</span>
                </div>
              </div>
            </div>

            {/* Skills Tag Input */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Required Technical Skills & Competencies *
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(skillInput);
                    }
                  }}
                  placeholder="Type a skill and press Enter (e.g. Next.js, PyTorch)..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-900 dark:text-white bg-white dark:bg-[#0B132B] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-subtle"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill(skillInput)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Add Skill
                </button>
              </div>

              {/* Selected Skills Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Common Suggestions */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Suggested Popular Tech:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SKILLS.filter(s => !skills.includes(s)).slice(0, 8).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleAddSkill(s)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Job Overview & Impact
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Detail the team mission, tech stack, key deliverables, and responsibilities..."
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-900 dark:text-white bg-white dark:bg-[#0B132B] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 shadow-subtle resize-none"
              />
            </div>

            {/* Status Selection & Submit */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Initial Status:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      status === 'active'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('draft')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      status === 'draft'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Draft
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Publishing...' : 'Publish Job Listing'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Live Preview Card Column (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <Eye className="w-4 h-4" />
            <span>Candidate Deck Preview</span>
          </div>

          {/* Swipe Card Mock */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-700/60 rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                  {workEnvironment}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 leading-snug">
                  {title || 'Senior Software Engineer'}
                </h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {company || 'Your Company'} • {location}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                {(company || 'Y').charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="text-sm font-black text-slate-900 dark:text-white">
              ${Math.round(salaryMin / 1000)}k - ${Math.round(salaryMax / 1000)}k / yr
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
              {description || 'Join our high-velocity team building mission-critical platform tools and customer-facing experiences.'}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {skills.slice(0, 4).map((skill, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded"
                >
                  {skill}
                </span>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-3 h-3" />
                92% ATS Match
              </span>
              <span>SwipeX Discovery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
