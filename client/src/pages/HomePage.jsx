import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PricingPage from './PricingPage';
import {
  ArrowRight,
  Globe,
  Database,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  Layers,
  Users,
  Search,
  RefreshCw,
  Mail,
  LogOut,
  ChevronRight,
  Filter,
  Sparkles
} from 'lucide-react';

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-industrial-950 text-white font-sans selection:bg-brand-orange selection:text-white flex flex-col">
      
      {/* 1. PUBLIC NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-industrial-950/90 backdrop-blur-md border-b border-industrial-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange to-amber-500 text-white flex items-center justify-center font-black text-xl tracking-tighter shadow-lg shadow-brand-orange/20 group-hover:scale-105 transition-transform">
              P
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-wider block">PROSQORA</span>
              <span className="text-[10px] text-industrial-400 font-mono block leading-tight">Lead Discovery & CRM</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-industrial-300">
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-brand-orange transition-colors">
              How It Works
            </button>
            <button onClick={() => scrollToSection('features')} className="hover:text-brand-orange transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-brand-orange transition-colors">
              Pricing (INR ₹)
            </button>
            <button onClick={() => scrollToSection('security')} className="hover:text-brand-orange transition-colors">
              Security
            </button>
          </nav>

          {/* User Auth Action CTA */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-industrial-900 border border-industrial-800 text-industrial-400 hover:text-red-400 hover:border-red-500/30 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-industrial-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-brand-orange/20 transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative px-6 py-20 lg:py-28 max-w-7xl mx-auto w-full text-center space-y-8">
        
        {/* Sub-badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs font-bold shadow-xl animate-in fade-in">
          <Sparkles className="w-4 h-4" />
          <span>Prosqora — Website Intelligence, Lead Discovery & CRM</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Turn Websites Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange via-amber-400 to-orange-500">Verified Sales Opportunities.</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-sm sm:text-base text-industrial-300 max-w-2xl mx-auto leading-relaxed">
          Discover businesses, verify websites, organize leads and manage your sales pipeline from one intelligent workspace.
        </p>

        {/* CTA Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-orange hover:bg-orange-600 font-extrabold text-white text-sm shadow-xl shadow-brand-orange/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Go to Prosqora Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-orange hover:bg-orange-600 font-extrabold text-white text-sm shadow-xl shadow-brand-orange/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <button
            onClick={() => scrollToSection('pricing')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-industrial-900 border border-industrial-800 hover:border-industrial-700 font-bold text-industrial-300 hover:text-white text-sm transition-all flex items-center justify-center gap-2"
          >
            <span>View Pricing</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Preview Card */}
        <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-5 bg-industrial-900/60 border border-industrial-800/80 rounded-2xl text-center">
            <span className="text-2xl font-extrabold text-brand-orange block">100%</span>
            <span className="text-xs text-industrial-400 font-semibold block mt-1">Single Website Deduplication</span>
          </div>
          <div className="p-5 bg-industrial-900/60 border border-industrial-800/80 rounded-2xl text-center">
            <span className="text-2xl font-extrabold text-amber-400 block">5-Stage</span>
            <span className="text-xs text-industrial-400 font-semibold block mt-1">Live Website Verification</span>
          </div>
          <div className="p-5 bg-industrial-900/60 border border-industrial-800/80 rounded-2xl text-center">
            <span className="text-2xl font-extrabold text-emerald-400 block">Multi-User</span>
            <span className="text-xs text-industrial-400 font-semibold block mt-1">RBAC & Audit Trail</span>
          </div>
          <div className="p-5 bg-industrial-900/60 border border-industrial-800/80 rounded-2xl text-center">
            <span className="text-2xl font-extrabold text-sky-400 block">Prosqora CRM</span>
            <span className="text-xs text-industrial-400 font-semibold block mt-1">Lead Discovery Engine</span>
          </div>
        </div>

      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="px-6 py-16 bg-industrial-950 border-t border-industrial-800/80">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold text-brand-orange uppercase tracking-wider block">Simplified Pipeline</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">How Prosqora Works</h2>
          </div>

          {/* Workflow Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-center">
            <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-full bg-brand-orange/20 text-brand-orange font-black text-sm flex items-center justify-center mx-auto">1</div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">DISCOVER</h3>
              <p className="text-[11px] text-industrial-400">Discover target business websites</p>
            </div>

            <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center mx-auto">2</div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">VERIFY</h3>
              <p className="text-[11px] text-industrial-400">Verify business information & SSL</p>
            </div>

            <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center mx-auto">3</div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">DEDUPLICATE</h3>
              <p className="text-[11px] text-industrial-400">Remove duplicate websites automatically</p>
            </div>

            <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 font-black text-sm flex items-center justify-center mx-auto">4</div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">ORGANIZE</h3>
              <p className="text-[11px] text-industrial-400">Store & categorize verified leads</p>
            </div>

            <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-black text-sm flex items-center justify-center mx-auto">5</div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">MANAGE</h3>
              <p className="text-[11px] text-industrial-400">Manage sales pipeline & team leads</p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features" className="px-6 py-20 bg-industrial-900/40 border-t border-industrial-800/80">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Core Product Capabilities</h2>
            <p className="text-xs sm:text-sm text-industrial-400">
              Prosqora provides end-to-end website discovery, verification, deduplication, and pipeline management.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-6 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-4 hover:border-brand-orange/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-orange/10 border border-brand-orange/30 text-brand-orange flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">Website Discovery</h3>
              <p className="text-xs text-industrial-400 leading-relaxed">
                Extract company name, phone numbers, emails, location, machinery, and capability details directly from target company websites.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-4 hover:border-brand-orange/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">Live Website Verification</h3>
              <p className="text-xs text-industrial-400 leading-relaxed">
                5-stage verification checks website accessibility, SSL status, domain health, and content validity before adding leads to CRM.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-4 hover:border-brand-orange/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">Smart Duplicate Detection</h3>
              <p className="text-xs text-industrial-400 leading-relaxed">
                Canonical URL normalization resolves protocols, www prefixes, and subdomains to maintain ONE UNIQUE WEBSITE = ONE LEAD PER WORKSPACE.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-4 hover:border-brand-orange/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">Team Collaboration & Workspaces</h3>
              <p className="text-xs text-industrial-400 leading-relaxed">
                Customer workspace isolation with Role-Based Access Control (Admin & Normal User) and complete team audit traceability.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-4 hover:border-brand-orange/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">Lead Import & Bulk Actions</h3>
              <p className="text-xs text-industrial-400 leading-relaxed">
                Batch import CSV lead files with automated background verification, duplicate rejection, and shift-click range selection.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-4 hover:border-brand-orange/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">Website Rescanning</h3>
              <p className="text-xs text-industrial-400 leading-relaxed">
                Re-scan existing leads to refresh contact info, address details, and technical capabilities without duplicating CRM entries.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION */}
      <section id="pricing" className="border-t border-industrial-800/80 bg-industrial-950 py-12">
        <PricingPage />
      </section>

      {/* 6. SECURITY SECTION */}
      <section id="security" className="px-6 py-20 max-w-7xl mx-auto w-full">
        <div className="bg-industrial-900 border border-industrial-800 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="space-y-4 max-w-xl">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Enterprise Security & Compliance</h2>
            <p className="text-xs sm:text-sm text-industrial-300 leading-relaxed">
              Prosqora isolates workspace data with JWT authentication, bcrypt password hashing, server-side authorization enforcement, and immutable audit logs.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-industrial-300 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Multi-tenant Isolation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Immutable Audit Logs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Server Authorization</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Encrypted Credentials</span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs shadow-xl shadow-brand-orange/25 transition-all"
              >
                Go to Dashboard
              </button>
            ) : (
              <Link
                to="/login"
                className="px-8 py-3.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs shadow-xl shadow-brand-orange/25 transition-all block"
              >
                Access Prosqora
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer id="about" className="mt-auto border-t border-industrial-800/80 bg-industrial-950 py-10 px-6 text-xs text-industrial-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-orange to-amber-500 text-white flex items-center justify-center font-black text-sm">
              P
            </div>
            <span className="font-extrabold text-white text-sm tracking-wider">PROSQORA</span>
          </div>

          <p className="text-industrial-400 text-[11px]">
            &copy; {new Date().getFullYear()} Prosqora. All rights reserved. Intelligent Lead Discovery & B2B CRM.
          </p>

          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/login" className="hover:text-brand-orange transition-colors">Login</Link>
            <button onClick={() => scrollToSection('features')} className="hover:text-brand-orange transition-colors">Features</button>
            <button onClick={() => scrollToSection('security')} className="hover:text-brand-orange transition-colors">Security</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
