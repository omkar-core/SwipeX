import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Camera, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  Building2, 
  Globe, 
  Award, 
  Sparkles, 
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react';
import { ProfileApiService } from '../../services/api';
import { UserProfile, UserProfileUpdate } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface ProfileEditScreenProps {
  onCancel?: () => void;
  onSaved?: () => void;
}

const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

const SUGGESTED_SKILLS = [
  'Figma', 'UX/UI', 'Design Systems', 'Prototyping', 'React', 
  'TypeScript', 'Tailwind CSS', 'Node.js', 'GraphQL', 'AWS', 
  'Product Strategy', 'User Research', 'Python', 'SQL'
];

export const ProfileEditScreen: React.FC<ProfileEditScreenProps> = ({ onCancel, onSaved }) => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Original snapshot for dirty tracking & cancel revert
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | ''>('');
  
  // Candidate Fields
  const [currentTitle, setCurrentTitle] = useState('');
  const [expectedSalary, setExpectedSalary] = useState<number | ''>('');
  const [jobTypePreference, setJobTypePreference] = useState<'Remote' | 'Hybrid' | 'On-site'>('Hybrid');

  // Recruiter Fields
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [designation, setDesignation] = useState('');

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const populateForm = (data: UserProfile) => {
    setName(data.name || '');
    setEmail(data.email || '');
    setPhone(data.phone || '');
    setLocation(data.location || '');
    setBio(data.bio || '');
    setAvatarUrl(data.profile_picture_url || user?.avatar || '');
    setSkills(data.skills || []);
    setExperienceYears(data.experience_years ?? '');
    
    // Candidate
    setCurrentTitle(data.current_title || user?.title || '');
    setExpectedSalary(data.expected_salary ?? '');
    setJobTypePreference((data.job_type_preference as any) || 'Hybrid');

    // Recruiter
    setCompanyName(data.company_name || '');
    setCompanyWebsite(data.company_website || '');
    setDesignation(data.designation || '');

    setErrors({});
  };

  // 1. Fetch Profile on Mount
  const fetchProfile = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await ProfileApiService.getProfile();
      setOriginalProfile(data);
      populateForm(data);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load profile data.');
      showToast('Could not load profile. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Client-Side Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errs.name = 'Full name must be at least 2 characters.';
    }

    if (phone.trim() && !PHONE_REGEX.test(phone.trim())) {
      errs.phone = 'Invalid phone format (e.g. +1-555-0143 or (555) 234-5678).';
    }

    if (experienceYears !== '' && (Number(experienceYears) < 0 || Number(experienceYears) > 70)) {
      errs.experienceYears = 'Experience years must be between 0 and 70.';
    }

    if (expectedSalary !== '' && Number(expectedSalary) < 0) {
      errs.expectedSalary = 'Expected salary must be a positive number.';
    }

    if (skills.length > 30) {
      errs.skills = 'You can add up to 30 skills max.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 3. Profile Picture Upload Handler
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Only JPG, PNG, and WebP images are allowed.', 'error');
      return;
    }

    // Validate size (max 2MB)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('Image file exceeds the 2MB size limit.', 'error');
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarUrl(objectUrl);

    setIsUploadingPhoto(true);
    try {
      const res = await ProfileApiService.uploadProfilePicture(file);
      setAvatarUrl(res.profile_picture_url);
      updateUser({ avatar: res.profile_picture_url, profile_picture_url: res.profile_picture_url });
      showToast('Profile picture uploaded!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload profile picture', 'error');
      // Revert if upload failed
      if (originalProfile) setAvatarUrl(originalProfile.profile_picture_url || '');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // 4. Skills Tag Helpers
  const addSkill = (skillToAdd?: string) => {
    const s = (skillToAdd || newSkillInput).trim();
    if (!s) return;
    if (skills.some(existing => existing.toLowerCase() === s.toLowerCase())) {
      setNewSkillInput('');
      return;
    }
    if (skills.length >= 30) {
      showToast('Maximum 30 skills reached.', 'warning');
      return;
    }
    setSkills([...skills, s]);
    setNewSkillInput('');
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  // 5. Save Changes Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fix the errors before saving.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload: UserProfileUpdate = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        bio: bio.trim() || undefined,
        profile_picture_url: avatarUrl || undefined,
        skills,
        experience_years: experienceYears !== '' ? Number(experienceYears) : undefined,
      };

      if (user?.role === 'recruiter') {
        payload.company_name = companyName.trim() || undefined;
        payload.company_website = companyWebsite.trim() || undefined;
        payload.designation = designation.trim() || undefined;
      } else {
        payload.current_title = currentTitle.trim() || undefined;
        payload.expected_salary = expectedSalary !== '' ? Number(expectedSalary) : undefined;
        payload.job_type_preference = jobTypePreference;
      }

      const updated = await ProfileApiService.updateProfile(payload);
      setOriginalProfile(updated);
      
      // Sync AuthContext so TopNav and sidebars update immediately
      updateUser({
        name: updated.name,
        avatar: updated.profile_picture_url,
        title: updated.current_title || updated.designation,
        skills: updated.skills,
        location: updated.location,
        bio: updated.bio,
      });

      showToast('Profile updated successfully!', 'success');
      if (onSaved) onSaved();
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Cancel & Revert
  const handleCancel = () => {
    if (originalProfile) {
      populateForm(originalProfile);
      showToast('Changes discarded.', 'info');
    }
    if (onCancel) {
      onCancel();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading your profile...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#111827] border border-red-200 dark:border-red-900/40 rounded-2xl text-center shadow-subtle">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unable to load profile</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">{loadError}</p>
        <button
          onClick={fetchProfile}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isRecruiter = user?.role === 'recruiter';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-card mb-8 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider backdrop-blur-sm">
                {isRecruiter ? 'Recruiter Profile' : 'Candidate Profile'}
              </span>
              <span className="text-blue-100 text-xs font-medium">Public & ATS Visibility</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Edit Your Profile</h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-lg">
              Keep your profile up-to-date to boost your algorithmic match scores and receive high-affinity opportunities.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 backdrop-blur-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* SECTION 1: Avatar & Basic Information */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 sm:p-8 shadow-subtle">
          <h2 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            General Information
          </h2>

          <div className="mt-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar Uploader */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div 
                onClick={handlePhotoClick}
                className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-blue-500/80 shadow-md cursor-pointer group bg-slate-100 dark:bg-slate-800"
                title="Click to change profile picture"
              >
                <img
                  src={avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"}
                  alt={name || "User Avatar"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <span>Change Photo</span>
                    </>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload profile photo"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                JPG, PNG, WebP · Max 2MB
              </span>
            </div>

            {/* Basic Info Fields */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    className={`w-full bg-white dark:bg-slate-800 border ${
                      errors.name ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-600'
                    } rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 shadow-subtle`}
                  />
                </div>
                {errors.name && <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.name}</p>}
              </div>

              {/* Email (Read only) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-[10px] font-normal text-slate-400">(Linked to Account)</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 014-3829"
                    className={`w-full bg-white dark:bg-slate-800 border ${
                      errors.phone ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-600'
                    } rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 shadow-subtle`}
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {errors.phone && <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.phone}</p>}
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="San Francisco, CA (Hybrid)"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-subtle"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Experience Years */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Total Industry Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="70"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 6"
                  className={`w-full sm:w-1/2 bg-white dark:bg-slate-800 border ${
                    errors.experienceYears ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-600'
                  } rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 shadow-subtle`}
                />
                {errors.experienceYears && <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.experienceYears}</p>}
              </div>

              {/* Bio / Summary */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Professional Bio / Summary
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {bio.length} / 2000
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Summarize your core competencies, leadership experience, and recent milestones..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-3.5 text-xs font-medium text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-subtle"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Role-Specific Details */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 sm:p-8 shadow-subtle">
          <h2 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
            {isRecruiter ? (
              <>
                <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Company & Recruiter Details
              </>
            ) : (
              <>
                <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Career Track & Job Preferences
              </>
            )}
          </h2>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {isRecruiter ? (
              <>
                {/* Recruiter Designation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Your Title / Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Lead Talent Partner"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-subtle"
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Nexus Technologies"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-subtle"
                  />
                </div>

                {/* Company Website */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Company Website
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://nexustech.io"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-subtle"
                    />
                    <Globe className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Current Job Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Current / Target Role Title
                  </label>
                  <input
                    type="text"
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    placeholder="e.g. Senior Product Designer"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-subtle"
                  />
                </div>

                {/* Expected Salary */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Annual Compensation ($)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5000"
                      min="0"
                      value={expectedSalary}
                      onChange={(e) => setExpectedSalary(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 165000"
                      className={`w-full bg-white dark:bg-slate-800 border ${
                        errors.expectedSalary ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-600'
                      } rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 shadow-subtle`}
                    />
                    <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.expectedSalary && <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.expectedSalary}</p>}
                </div>

                {/* Work Environment Preference */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Work Location Preference
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Remote', 'Hybrid', 'On-site'] as const).map((env) => (
                      <button
                        key={env}
                        type="button"
                        onClick={() => setJobTypePreference(env)}
                        className={`py-3 px-4 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          jobTypePreference === env
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {jobTypePreference === env && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        {env}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION 3: Skills & Tag Management */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 p-6 sm:p-8 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Core Competencies & Skills
            </h2>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {skills.length} / 30 tags
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {/* Tag Input Box */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder="Type a skill and press Enter (e.g. Design Systems, GraphQL)"
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-subtle"
              />
              <button
                type="button"
                onClick={() => addSkill()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            {errors.skills && <p className="text-[11px] text-red-500 font-medium">{errors.skills}</p>}

            {/* Current Active Chips */}
            <div className="flex flex-wrap gap-2 pt-2 min-h-[44px]">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 rounded-lg text-xs font-semibold shadow-2xs group"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="w-3.5 h-3.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 transition-colors"
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="w-2.5 h-2.5 stroke-[3]" />
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <span className="text-xs text-slate-400 italic py-1">No skills added yet. Choose from suggestions below or type your own.</span>
              )}
            </div>

            {/* Quick-Add Suggestions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                Quick Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addSkill(suggestion)}
                    className="text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-md border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form Bottom Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-12">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all shadow-subtle"
          >
            Cancel & Revert
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
