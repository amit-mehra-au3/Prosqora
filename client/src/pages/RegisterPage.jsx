import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Building,
  CreditCard,
  ArrowLeft
} from 'lucide-react';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan') || 'growth';

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await axios.get('/api/billing/plans');
      if (res.data.success && res.data.plans) {
        setPlans(res.data.plans);
        const matched = res.data.plans.find((p) => p.plan_id === planParam.toLowerCase());
        setSelectedPlan(matched || res.data.plans[1] || res.data.plans[0]);
      }
    } catch (e) {
      console.error('Failed to fetch pricing plans:', e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !companyName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!selectedPlan) {
      setError('Please select a valid pricing plan.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register-admin', {
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        phone: phone.trim(),
        gstin: gstin.trim(),
        plan_id: selectedPlan.plan_id
      });

      if (res.data.success && res.data.token) {
        // Authenticate immediately into workspace
        await login(email.trim(), password, true);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-industrial-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-brand-orange selection:text-white">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-orange to-amber-500 text-white font-black text-xl tracking-tighter shadow-xl hover:scale-105 transition-transform">
          P
        </Link>
        <h1 className="text-2xl font-black text-white tracking-wider">Create Your Prosqora Account</h1>
        <p className="text-xs text-industrial-400">
          Register your company workspace and manage your sales intelligence pipeline.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Selected Plan Summary Banner */}
          {selectedPlan && (
            <div className="p-4 rounded-xl bg-industrial-950 border border-brand-orange/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center font-black text-sm">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-industrial-400 uppercase tracking-wider block font-semibold">Selected Plan</span>
                  <span className="text-sm font-extrabold text-white">{selectedPlan.name} Plan</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-brand-orange block">
                  {selectedPlan.formatted_price || `₹${selectedPlan.price}`}
                </span>
                <Link to="/pricing" className="text-[10px] text-industrial-400 hover:text-white underline">
                  Change Plan
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-industrial-300 mb-1">
                Full Name <span className="text-brand-orange">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Amit Mehra"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange text-white"
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-xs font-semibold text-industrial-300 mb-1">
                Company Name <span className="text-brand-orange">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AM Automation Trading Pvt Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange text-white"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-industrial-300 mb-1">
                Admin Work Email <span className="text-brand-orange">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange text-white"
              />
            </div>

            {/* Phone & GSTIN */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="06BJJPA2334N1ZA"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange text-white uppercase font-mono"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">
                  Password <span className="text-brand-orange">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="industrial-input w-full text-xs pl-3.5 pr-9 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">
                  Confirm Password <span className="text-brand-orange">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 focus:border-brand-orange text-white"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-orange hover:bg-orange-600 font-extrabold text-white shadow-lg shadow-brand-orange/20 text-xs transition-all"
              >
                <span>{loading ? 'Creating Workspace...' : 'Activate Admin Workspace & Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>

          <div className="pt-3 border-t border-industrial-800 text-center">
            <Link to="/login" className="text-xs text-industrial-400 hover:text-white font-medium inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Already registered? Return to Login</span>
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
