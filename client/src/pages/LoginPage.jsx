import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
  ArrowLeft,
  Lock,
  ChevronRight
} from 'lucide-react';

export default function LoginPage() {
  // Login selection state: 'selection' | 'admin' | 'user'
  const [loginType, setLoginType] = useState('selection');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSelectLoginType = (type) => {
    setError('');
    setEmail('');
    setPassword('');
    setLoginType(type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      // Backend handles authenticating credentials & resolving actual user role from DB
      await login(email.trim(), password, remember);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-industrial-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-brand-orange selection:text-white">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link to="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-orange to-amber-500 text-white font-black text-2xl tracking-tighter shadow-xl shadow-brand-orange/20 hover:scale-105 transition-transform">
          P
        </Link>
        <h1 className="text-3xl font-black text-white tracking-wider">PROSQORA</h1>
        <p className="text-xs text-industrial-400 font-medium">
          Intelligent Lead Discovery & CRM
        </p>
      </div>

      {/* Main Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        
        {/* STEP 1: CHOOSE LOGIN TYPE SELECTION SCREEN */}
        {loginType === 'selection' && (
          <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="text-center space-y-1">
              <h2 className="text-xl font-extrabold text-white tracking-tight">Welcome Back</h2>
              <p className="text-xs text-industrial-400">
                Choose how you want to sign in to your workspace.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              
              {/* Option 1: Admin Login Card */}
              <button
                onClick={() => handleSelectLoginType('admin')}
                className="w-full text-left p-5 bg-industrial-950 hover:bg-industrial-950/80 border border-industrial-800 hover:border-brand-orange/50 rounded-2xl transition-all group shadow-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm group-hover:text-brand-orange transition-colors">Admin Login</h3>
                    <p className="text-[11px] text-industrial-400 mt-0.5">Manage users, leads, permissions & CRM settings.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-industrial-500 group-hover:text-brand-orange transition-colors" />
              </button>

              {/* Option 2: Normal User Login Card */}
              <button
                onClick={() => handleSelectLoginType('user')}
                className="w-full text-left p-5 bg-industrial-950 hover:bg-industrial-950/80 border border-industrial-800 hover:border-sky-500/50 rounded-2xl transition-all group shadow-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm group-hover:text-sky-400 transition-colors">Normal User Login</h3>
                    <p className="text-[11px] text-industrial-400 mt-0.5">Access leads, website scanning, and CRM tools.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-industrial-500 group-hover:text-sky-400 transition-colors" />
              </button>

            </div>

            <div className="pt-4 border-t border-industrial-800 text-center">
              <Link to="/" className="text-xs text-industrial-400 hover:text-white font-medium inline-flex items-center gap-1.5 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Public Homepage</span>
              </Link>
            </div>

          </div>
        )}

        {/* STEP 2: LOGIN FORM (ADMIN OR NORMAL USER) */}
        {(loginType === 'admin' || loginType === 'user') && (
          <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-8 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-150">
            
            {/* Header & Back Button */}
            <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  loginType === 'admin'
                    ? 'bg-brand-orange/20 border-brand-orange/40 text-brand-orange'
                    : 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                }`}>
                  {loginType === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white tracking-tight">
                    {loginType === 'admin' ? 'Admin Login' : 'Normal User Login'}
                  </h2>
                  <p className="text-[11px] text-industrial-400">
                    {loginType === 'admin' ? 'Workspace & System Management' : 'Industrial CRM Workspace Access'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setLoginType('selection')}
                className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-all text-xs font-semibold flex items-center gap-1"
                title="Choose Login Type"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="font-semibold text-industrial-300 block text-xs">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange focus:outline-none transition-colors text-white"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-industrial-300 block text-xs">Password</label>
                  <Link to="/forgot-password" className="text-[11px] text-brand-orange hover:underline font-semibold">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="industrial-input w-full text-xs pl-3.5 pr-10 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange focus:outline-none transition-colors text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-industrial-300 transition-colors p-0.5 focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-industrial-300 text-xs">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-industrial-700 bg-industrial-950 text-brand-orange focus:ring-0"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 font-bold text-white shadow-lg shadow-brand-orange/20 transition-all text-xs"
                >
                  <span>{loading ? 'Authenticating...' : 'Login'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>

            </form>

            {loginType === 'admin' && (
              <div className="pt-4 border-t border-industrial-800 text-center space-y-2">
                <p className="text-xs text-industrial-400">Don't have an Admin account?</p>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-industrial-950 hover:bg-industrial-800 border border-industrial-700 text-brand-orange font-bold text-xs transition-colors"
                >
                  <span>Create Admin Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            <div className="pt-2 border-t border-industrial-800 text-center">
              <button
                type="button"
                onClick={() => setLoginType('selection')}
                className="text-[11px] text-industrial-400 hover:text-white font-medium inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Switch Login Type</span>
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
