import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Cpu, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError('Failed to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-industrial-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-brand-orange selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/30 text-brand-orange shadow-xl shadow-brand-orange/10">
          <Cpu className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">AutoLead</h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-8 shadow-2xl space-y-6">
          
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Forgot Password</h2>
            <p className="text-xs text-industrial-400 mt-1">
              Enter your registered account email to receive reset instructions.
            </p>
          </div>

          {submitted ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Reset Link Sent</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If an account exists for <strong>{email}</strong>, a password reset link has been generated. Please check your inbox.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-industrial-300 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-industrial-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="industrial-input w-full pl-9 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 font-bold text-white shadow-lg shadow-brand-orange/20 transition-all text-xs"
              >
                {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="text-center border-t border-industrial-800 pt-4 text-xs">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-industrial-400 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
