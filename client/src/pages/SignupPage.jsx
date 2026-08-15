import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cpu, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    email: '',
    password: '',
    confirm_password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.full_name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signup(formData);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-industrial-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-brand-orange selection:text-white">
      
      {/* SaaS Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/30 text-brand-orange shadow-xl shadow-brand-orange/10">
          <Cpu className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">AutoLead</h1>
        <p className="text-xs text-industrial-400 font-medium">
          Create your private CRM workspace
        </p>
      </div>

      {/* Signup Card Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-8 shadow-2xl space-y-6">
          
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Create Your Account</h2>
            <p className="text-xs text-industrial-400 mt-1">
              Start finding and managing industrial automation clients today.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-industrial-300 block text-xs">Full Name</label>
              <input
                type="text"
                name="full_name"
                required
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={handleChange}
                className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange focus:outline-none transition-colors"
              />
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-industrial-300 block text-xs">Company Name</label>
              <input
                type="text"
                name="company_name"
                placeholder="Enter your company name"
                value={formData.company_name}
                onChange={handleChange}
                className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange focus:outline-none transition-colors"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="font-semibold text-industrial-300 block text-xs">Email Address</label>
              <input
                type="email"
                name="email"
                required
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange focus:outline-none transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="font-semibold text-industrial-300 block text-xs">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
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

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="font-semibold text-industrial-300 block text-xs">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm_password"
                  required
                  placeholder="Re-enter your password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="industrial-input w-full text-xs pl-3.5 pr-10 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-industrial-300 transition-colors p-0.5 focus:outline-none"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 font-bold text-white shadow-lg shadow-brand-orange/20 transition-all text-xs"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>

          </form>

          {/* Login Prompt */}
          <div className="text-center border-t border-industrial-800 pt-4 text-xs text-industrial-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-orange font-bold hover:underline ml-1">
              Login
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
