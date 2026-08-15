import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Building, Mail, Phone, ShieldCheck, Save, CheckCircle, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    company_name: user?.company_name || '',
    phone: user?.phone || ''
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateProfile(formData);
      setSuccessMsg('Profile details updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Account & User Profile</h1>
        <p className="text-xs text-industrial-400 mt-1">
          Manage your personal details, workspace profile, and CRM contact preferences.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Account Summary */}
        <div className="industrial-card p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-brand-orange/20 border-2 border-brand-orange text-brand-orange font-bold text-2xl flex items-center justify-center mx-auto shadow-xl">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div>
            <h2 className="text-base font-bold text-white">{user?.full_name}</h2>
            <p className="text-xs text-industrial-400">{user?.company_name || 'Individual Workspace'}</p>
          </div>

          <div className="pt-2 border-t border-industrial-800 space-y-2 text-left text-xs font-mono">
            <div className="flex items-center justify-between text-industrial-300">
              <span>Account Type:</span>
              <span className="px-2 py-0.5 rounded bg-brand-orange/20 text-brand-orange font-bold">
                {user?.role === 'admin' ? 'Administrator' : 'Standard SaaS'}
              </span>
            </div>

            <div className="flex items-center justify-between text-industrial-300">
              <span>Tenant ID:</span>
              <span className="text-industrial-400">{user?.user_id}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Form */}
        <form onSubmit={handleSubmit} className="md:col-span-2 industrial-card p-6 space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-industrial-300 border-b border-industrial-800 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-orange" />
            <span>Profile Information</span>
          </h3>

          <div className="space-y-4 text-xs">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="font-semibold text-industrial-300 block">Full Name</label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                className="industrial-input w-full text-xs"
              />
            </div>

            {/* Company Name */}
            <div className="space-y-1">
              <label className="font-semibold text-industrial-300 block">Company / Workspace Name</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="e.g. Vision Automation Systems"
                className="industrial-input w-full text-xs"
              />
            </div>

            {/* Email (Read-Only) */}
            <div className="space-y-1">
              <label className="font-semibold text-industrial-300 block">Email Address (Primary Identity)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="industrial-input w-full text-xs bg-industrial-950 text-industrial-400 cursor-not-allowed"
              />
              <span className="text-[10px] text-industrial-500">Contact admin to update account email address.</span>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="font-semibold text-industrial-300 block">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 9876543210"
                className="industrial-input w-full text-xs font-mono"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-industrial-800">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>

          </div>
        </form>

      </div>

    </div>
  );
}
