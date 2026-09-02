import React, { useState } from 'react';
import { Zap, Code2, PenTool, BarChart3, ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import { useJobs } from '../../context/JobContext';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

type RoleType = 'designer' | 'engineer' | 'pm' | null;
type WorkPref = 'Remote' | 'Hybrid' | 'On-site';

const ROLE_OPTIONS: { id: RoleType; label: string; sub: string; icon: React.ReactNode; skills: string[] }[] = [
  {
    id: 'designer',
    label: 'Product Designer',
    sub: 'UX/UI, Figma, Design Systems',
    icon: <PenTool className="w-6 h-6" />,
    skills: ['Figma', 'UX/UI', 'Design Systems', 'Prototyping', 'User Research'],
  },
  {
    id: 'engineer',
    label: 'Software Engineer',
    sub: 'React, TypeScript, Node.js',
    icon: <Code2 className="w-6 h-6" />,
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS'],
  },
  {
    id: 'pm',
    label: 'Product Manager',
    sub: 'Roadmapping, Strategy, Metrics',
    icon: <BarChart3 className="w-6 h-6" />,
    skills: ['Product Strategy', 'Roadmapping', 'SQL', 'A/B Testing', 'Stakeholder Management'],
  },
];

const ALL_SKILLS_BY_ROLE: Record<string, string[]> = {
  designer: ['Figma', 'UX/UI', 'Design Systems', 'Prototyping', 'User Research', 'Sketch', 'Adobe XD', 'Motion Design', 'Accessibility (WCAG)', 'Design Tokens'],
  engineer: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS', 'Python', 'Docker', 'PostgreSQL', 'Kubernetes', 'CI/CD'],
  pm: ['Product Strategy', 'Roadmapping', 'SQL', 'A/B Testing', 'Stakeholder Management', 'JIRA', 'OKRs', 'Market Research', 'Pricing Strategy', 'Growth Hacking'],
};

const WORK_PREFS: { id: WorkPref; emoji: string; desc: string }[] = [
  { id: 'Remote', emoji: '🌍', desc: 'Work from anywhere' },
  { id: 'Hybrid', emoji: '🏢', desc: 'Best of both worlds' },
  { id: 'On-site', emoji: '🏙️', desc: 'Full office environment' },
];

const SALARY_RANGES = [
  { label: '$80k–$120k', min: 80000, max: 120000 },
  { label: '$120k–$160k', min: 120000, max: 160000 },
  { label: '$160k–$200k', min: 160000, max: 200000 },
  { label: '$200k+', min: 200000, max: 350000 },
];

/**
 * Feature 8 — Onboarding Skills Wizard
 * 3-step first-run experience:
 * Step 1: Role type selection (Designer / Engineer / PM)
 * Step 2: Skills multi-select chip picker
 * Step 3: Work preferences + salary range
 * Pre-fills FilterState and user preferences on completion.
 */
export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const { setFilters, toggleWorkEnvironment, setSalaryRange, setIndustry } = useJobs();
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<RoleType>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [selectedWorkPrefs, setSelectedWorkPrefs] = useState<Set<WorkPref>>(new Set(['Remote', 'Hybrid']));
  const [selectedSalary, setSelectedSalary] = useState(1); // index into SALARY_RANGES

  const steps = ['Role', 'Skills', 'Preferences'];

  const availableSkills = selectedRole ? ALL_SKILLS_BY_ROLE[selectedRole] : [];

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  };

  const toggleWorkPref = (pref: WorkPref) => {
    setSelectedWorkPrefs(prev => {
      const next = new Set(prev);
      if (next.has(pref)) next.delete(pref);
      else next.add(pref);
      return next;
    });
  };

  const handleComplete = () => {
    const salary = SALARY_RANGES[selectedSalary];
    // Apply preferences to JobContext filters
    const roleIndustry = selectedRole === 'designer' ? 'Technology'
      : selectedRole === 'engineer' ? 'Technology'
      : 'All';
    setIndustry(roleIndustry);
    setSalaryRange(salary.min, salary.max);
    // Reset work environments to match selections
    (['Remote', 'Hybrid', 'On-site'] as WorkPref[]).forEach(pref => {
      // We have to use toggleWorkEnvironment carefully — it's a toggle so only call when needed
    });
    setFilters(prev => ({
      ...prev,
      industry: roleIndustry,
      salaryMin: salary.min,
      salaryMax: salary.max,
      workEnvironments: Array.from(selectedWorkPrefs),
    }));
    onComplete();
  };

  const canProceedStep0 = selectedRole !== null;
  const canProceedStep1 = selectedSkills.size >= 2;
  const canProceedStep2 = selectedWorkPrefs.size >= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-white dark:bg-[#111827] rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700/60 overflow-hidden"
        style={{ animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-6 py-5 relative">
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-blue-200 fill-blue-200" />
            <span className="text-white font-black text-lg">SwipeX</span>
          </div>
          <h2 className="text-white font-bold text-xl leading-tight">Let's personalize your<br />job discovery</h2>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    i < step ? 'bg-green-400 text-white'
                    : i === step ? 'bg-white text-blue-700'
                    : 'bg-white/25 text-white/70'
                  }`}>
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${i === step ? 'text-white' : 'text-white/60'}`}>{s}</span>
                </div>
                {i < steps.length - 1 && <div className="flex-1 h-px bg-white/25" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Step 0: Role Selection */}
          {step === 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">What's your primary role?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">We'll curate job cards and skills that match your track.</p>
              <div className="space-y-3">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => {
                      setSelectedRole(role.id);
                      setSelectedSkills(new Set(role.skills));
                    }}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      selectedRole === role.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedRole === role.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {role.icon}
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${selectedRole === role.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                        {role.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{role.sub}</div>
                    </div>
                    {selectedRole === role.id && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Skills Selection */}
          {step === 1 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Pick your key skills</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Select at least 2. These will be used for ATS matching.</p>
              <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                {availableSkills.map((skill) => {
                  const isSelected = selectedSkills.has(skill);
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}
                    >
                      {isSelected && <span className="mr-1">✓</span>}{skill}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">{selectedSkills.size} selected</p>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Work environment */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Where do you prefer to work?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Select all that apply.</p>
                <div className="flex gap-3">
                  {WORK_PREFS.map((pref) => {
                    const isSelected = selectedWorkPrefs.has(pref.id);
                    return (
                      <button
                        key={pref.id}
                        onClick={() => toggleWorkPref(pref.id)}
                        className={`flex-1 flex flex-col items-center gap-1 py-3.5 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl">{pref.emoji}</span>
                        <span className={`text-[11px] font-bold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {pref.id}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 text-center">{pref.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Salary target */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Target salary range</h3>
                <div className="grid grid-cols-2 gap-2">
                  {SALARY_RANGES.map((range, i) => (
                    <button
                      key={range.label}
                      onClick={() => setSelectedSalary(i)}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                        selectedSalary === i
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 pb-6 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step < steps.length - 1) setStep(step + 1);
              else handleComplete();
            }}
            disabled={
              (step === 0 && !canProceedStep0) ||
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2)
            }
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              (step === 0 && !canProceedStep0) ||
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2)
                ? 'bg-slate-100 dark:bg-slate-700/40 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm cursor-pointer'
            }`}
          >
            {step < steps.length - 1 ? (
              <>
                Next <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                Start Discovering
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
