import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-industrial-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-brand-orange selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/30 text-brand-orange shadow-xl shadow-brand-orange/10">
          <Cpu className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">AutoLead</h1>
        <p className="text-xs text-industrial-400 font-medium">
          Industrial Sales Intelligence CRM
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Public Signup Disabled</h2>
            <p className="text-xs text-industrial-400 mt-2 leading-relaxed">
              Public self-registration is disabled for security. New user accounts are created by your workspace Administrator.
            </p>
          </div>

          <div className="pt-4 border-t border-industrial-800">
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 font-bold text-white shadow-lg shadow-brand-orange/20 transition-all text-xs"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
