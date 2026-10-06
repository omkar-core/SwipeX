import React, { useState } from 'react';
import { Mail, Lock, Zap, UserCheck, Briefcase, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { login, register, loginWithGoogle, isLoading } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [maintainSession, setMaintainSession] = useState(true);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('candidate');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegisterMode) {
        await register(name, email, password, role);
        showToast(`Account created as ${role}!`, 'success');
      } else {
        await login(email, password);
        showToast('Successfully authenticated!', 'success');
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Authentication failed. Please verify credentials.', 'error');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      showToast('Authenticated via Google OAuth', 'success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Google OAuth failed', 'error');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Left Panel - Dark Navy Hero */}
      <div className="w-full md:w-[45%] lg:w-[48%] bg-[#080E2A] relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden text-white min-h-[360px] md:min-h-screen">
        {/* Background Subtle Trajectory Graphic / Arrows */}
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-50 700 L250 350 L400 500 L650 150" stroke="#3B82F6" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M100 850 L380 480 L520 600 L750 260" stroke="#1D4ED8" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M-100 550 L180 200 L320 320 L580 -20" stroke="#60A5FA" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="650" cy="150" r="16" fill="#60A5FA" />
            <circle cx="250" cy="350" r="12" fill="#3B82F6" />
          </svg>
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-8 h-8 rounded flex items-center justify-center">
            <Zap className="w-7 h-7 text-white fill-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">SwipeX</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 my-auto py-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
            Accelerate <br />
            Your Trajectory
          </h1>
          <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-md leading-relaxed opacity-90">
            Intelligent swipe-based career matching powered by real-time ATS optimization.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} SwipeX Inc. Enterprise Career Infrastructure.
        </div>
      </div>

      {/* Right Panel - Access Workspace Form */}
      <div className="w-full md:w-[55%] lg:w-[52%] flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-white">
        <div className="w-full max-w-[440px]">
          {/* Card Title & Subtitle */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {isRegisterMode ? 'Create Account' : 'Access Workspace'}
            </h2>
            <p className="text-slate-500 text-sm mt-1.5">
              {isRegisterMode ? 'Sign up to discover curated high-trajectory opportunities.' : 'Enter your credentials to continue.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegisterMode && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Alex Mercer"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'candidate' as UserRole, label: 'Candidate', icon: UserCheck },
                      { id: 'recruiter' as UserRole, label: 'Recruiter', icon: Briefcase },
                      { id: 'admin' as UserRole, label: 'Admin', icon: Shield },
                    ].map((r) => {
                      const Icon = r.icon;
                      const isSelected = role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span>{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Corporate Email
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="user@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Secure Password
                </label>
                {!isRegisterMode && (
                  <button
                    type="button"
                    onClick={() => showToast('Password reset link sent to corporate email.', 'info')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Recover?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all tracking-wider"
                />
              </div>
            </div>

            {/* Maintain Session Checkbox */}
            <div className="flex items-center pt-0.5">
              <input
                id="maintain-session"
                type="checkbox"
                checked={maintainSession}
                onChange={(e) => setMaintainSession(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="maintain-session" className="ml-2 text-xs font-medium text-slate-600 select-none cursor-pointer">
                Maintain session
              </label>
            </div>

            {/* Authenticate Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-150 shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-70"
            >
              {isLoading ? 'AUTHENTICATING...' : isRegisterMode ? 'CREATE ACCOUNT' : 'AUTHENTICATE'}
            </button>
          </form>

          {/* OR Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                OR
              </span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2.5 shadow-subtle cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Mode toggle */}
          <div className="mt-6 text-center text-xs text-slate-500">
            {isRegisterMode ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Access Workspace
                </button>
              </>
            ) : (
              <>
                New to SwipeX?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </>
            )}
          </div>

          {/* Dev Demo Credentials Quick Helper */}
          {import.meta.env.DEV && (
            <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 text-slate-600">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Demo Credentials</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-extrabold tracking-wider">DEV ONLY</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200">
                <span>Candidate: <code className="font-mono font-medium text-slate-800">alex@swipex.io</code></span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('alex@swipex.io');
                    setPassword('Password123!');
                    setIsRegisterMode(false);
                  }}
                  className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold cursor-pointer text-[11px] transition-colors"
                >
                  Auto-fill
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Recruiter: <code className="font-mono font-medium text-slate-800">recruiter@swipex.io</code></span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('recruiter@swipex.io');
                    setPassword('Password123!');
                    setIsRegisterMode(false);
                  }}
                  className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold cursor-pointer text-[11px] transition-colors"
                >
                  Auto-fill
                </button>
              </div>
              <div className="text-[10px] text-slate-400">Password: <code className="font-mono text-slate-600 font-medium">Password123!</code></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
