import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cpu, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password, remember);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Email or password is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-industrial-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-brand-orange selection:text-white">
      
      {/* SaaS Brand Logo Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/30 text-brand-orange shadow-xl shadow-brand-orange/10">
          <Cpu className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">AutoLead</h1>
        <p className="text-xs text-industrial-400 font-medium">
          Automation Website Finder & SaaS CRM
        </p>
      </div>

      {/* Login Card Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-8 shadow-2xl space-y-6">
          
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Welcome Back</h2>
            <p className="text-xs text-industrial-400 mt-1">
              Log in to access your private industrial automation CRM workspace.
            </p>
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
                className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange focus:outline-none transition-colors"
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
                  className="industrial-input w-full text-xs pl-3.5 pr-10 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange focus:outline-none transition-colors"
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
                <span>{loading ? 'Logging in...' : 'Login'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>

          </form>

          {/* Create Account Prompt */}
          <div className="text-center border-t border-industrial-800 pt-4 text-xs text-industrial-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-orange font-bold hover:underline ml-1">
              Create Account
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
